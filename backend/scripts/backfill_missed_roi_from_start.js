/**
 * backfill_missed_roi_from_start.js
 * 
 * MANUAL SCRIPT: Backfill all ROI that should have been earned from investment start date until today
 * This calculates ROI for every day from startDate to today (minus today)
 * 
 * THIS IS A DESTRUCTIVE FIX - It resets lastRoiDate to before startDate to force recalculation
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const InvestorInvestment = require('../src/models/InvestorInvestment');
const Transaction = require('../src/models/Transaction');
const Notification = require('../src/models/Notification');
const { getInvestmentPhase, getDailyRateForPhase, getMonthlyRatePhase3 } = require('../config/investorConstants');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
  process.exit(1);
}

let stats = {
  updated: 0,
  skipped: 0,
  roiAmount: 0
};

async function backfillROI() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    console.log('=' .repeat(100));
    console.log('🚀 BACKFILL: All ROI from Investment Start Dates');
    console.log('=' .repeat(100) + '\n');

    // Get all active investments
    const investments = await InvestorInvestment.find({
      userId: { $ne: null },
      status: 'active'
    }).populate('userId');

    console.log(`Found ${investments.length} active investments\n`);

    let totalROI = 0;

    for (const inv of investments) {
      try {
        const investor = inv.userId;
        if (!investor || !investor.isActive) {
          stats.skipped++;
          continue;
        }

        // Skip test users
        if (investor.name && investor.name.startsWith('Test_Final_')) {
          stats.skipped++;
          continue;
        }

        // Calculate all days from startDate to today
        const startDate = new Date(inv.startDate || inv.createdAt);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Days to calculate ROI for (from start to yesterday)
        let dayCount = 0;
        let currentDay = new Date(startDate);
        currentDay.setHours(0, 0, 0, 0);

        while (currentDay < today) {
          dayCount++;
          currentDay.setDate(currentDay.getDate() + 1);
        }

        if (dayCount === 0) {
          stats.skipped++;
          console.log(`  ✓ ${investor.name} - Investment $${inv.amount} - Started today (0 days of ROI)`);
          continue;
        }

        // Determine phase and calculate rate
        const phase = getInvestmentPhase(inv.createdAt);
        let dailyRoiAmount = 0;
        let phaseDesc = '';

        if (phase === 1 || phase === 2) {
          const phaseRate = getDailyRateForPhase(inv.packageNumber, inv.createdAt);
          if (phaseRate && phaseRate > 0) {
            dailyRoiAmount = Number(((inv.amount * phaseRate) / 100).toFixed(4));
            phaseDesc = `Phase ${phase}`;
          }
        } else if (phase === 3) {
          const monthlyRate = getMonthlyRatePhase3();
          const dailyEquivalent = monthlyRate / 30.44;
          dailyRoiAmount = Number(((inv.amount * dailyEquivalent) / 100).toFixed(4));
          phaseDesc = `Phase 3`;
        }

        if (dailyRoiAmount <= 0) {
          stats.skipped++;
          console.log(`  ⚠️  ${investor.name} - Invalid rate for phase ${phase}`);
          continue;
        }

        let totalROIForInvestment = dailyRoiAmount * dayCount;
        let roiToCredit = totalROIForInvestment;

        // Check income cap
        const projectedTotal = (inv.totalRoiEarned || 0) + totalROIForInvestment;
        if (projectedTotal > inv.incomeCap) {
          roiToCredit = inv.incomeCap - (inv.totalRoiEarned || 0);
          if (roiToCredit <= 0) {
            stats.skipped++;
            console.log(`  ✓ ${investor.name} - Investment $${inv.amount} - Cap already reached`);
            continue;
          }
        }

        // Credit ROI
        await User.findByIdAndUpdate(investor._id, {
          $inc: {
            'wallet.roi': roiToCredit,
            totalRoiEarned: roiToCredit
          }
        });

        // Create transaction
        await Transaction.create({
          userId: investor._id,
          type: 'profit',
          amount: roiToCredit,
          status: 'completed',
          description: `BACKFILL: ${dayCount} days of ${phaseDesc} daily ROI (${(dailyRoiAmount).toFixed(4)} per day) from $${inv.amount} investment`,
          referenceId: inv._id,
          referenceModel: 'InvestorInvestment'
        });

        // Update investment to reset lastRoiDate for future processing
        const yesterdayStart = new Date(today);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);

        await InvestorInvestment.findByIdAndUpdate(inv._id, {
          $set: { lastRoiDate: yesterdayStart },
          $inc: { totalRoiEarned: roiToCredit }
        });

        // Check if cap reached
        if (projectedTotal >= inv.incomeCap) {
          await InvestorInvestment.findByIdAndUpdate(inv._id, {
            $set: { capReached: true, status: 'completed' }
          });
        }

        // Notify
        await Notification.create({
          userId: investor._id,
          title: '🎯 BACKFILL: Missed ROI Credited',
          message: `You have been credited $${roiToCredit.toFixed(2)} for ${dayCount} missed days of ${phaseDesc} ROI on your $${inv.amount} investment`,
          type: 'profit'
        });

        console.log(`  ✅ ${investor.name} - Credited $${roiToCredit.toFixed(2)} (${dayCount} days × $${dailyRoiAmount.toFixed(4)})`);
        stats.updated++;
        stats.roiAmount += roiToCredit;
        totalROI += roiToCredit;

      } catch (err) {
        console.error(`  ❌ Error processing ${inv._id}:`, err.message);
      }
    }

    console.log('\n' + '=' .repeat(100));
    console.log('📊 FINAL SUMMARY');
    console.log('=' .repeat(100));
    console.log(`\n✅ Updated: ${stats.updated} investments`);
    console.log(`⏭️  Skipped: ${stats.skipped} investments`);
    console.log(`💰 Total ROI Credited: $${stats.roiAmount.toFixed(2)}\n`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

backfillROI().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
