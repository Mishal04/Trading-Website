/**
 * manual_credit_missed_roi_commissions.js
 * 
 * MANUAL SCRIPT: Calculate and credit all missed daily ROI and level commissions
 * to users who should have received them since the profit cron started running.
 * 
 * This script:
 * 1. Finds all active investments and calculates their daily ROI from their start date until today
 * 2. Credits ROI to user wallets and creates transactions
 * 3. Calculates and credits 21-level commissions based on investment amounts
 * 4. Creates audit log of all credits
 * 5. Does NOT double-credit (checks lastRoiDate to skip already-processed days)
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Investment = require('../src/models/Investment');
const InvestorInvestment = require('../src/models/InvestorInvestment');
const Transaction = require('../src/models/Transaction');
const Notification = require('../src/models/Notification');
const CommissionLog = require('../src/models/CommissionLog');
const { getInvestmentPhase, getDailyRateForPhase, getMonthlyRatePhase3 } = require('../config/investorConstants');

const MONGODB_URI = process.env.MONGODB_URI;
const LEVEL_RATES = [25, 5, 5, 2, 2, 2, 2, 2, 2, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9];

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
  process.exit(1);
}

let stats = {
  roiCredits: 0,
  roiAmount: 0,
  commissionCredits: 0,
  commissionAmount: 0,
  errors: []
};

/**
 * Credit daily ROI for Investment model (legacy tier system)
 */
async function creditMissedInvestmentROI() {
  console.log('\n📊 PASS 1: Crediting missed daily ROI for Investment records...\n');

  const investments = await Investment.find({
    isActive: true,
    status: 'active'
  }).populate('userId');

  console.log(`Found ${investments.length} active investments to process\n`);

  for (const investment of investments) {
    try {
      const investor = investment.userId;
      if (!investor || !investor.isActive) continue;

      // Skip test users
      if (investor.name && investor.name.startsWith('Test_Final_')) continue;
      if (investor.email && investor.email.endsWith('@test.com')) continue;

      // Calculate all days from startDate to today that haven't been credited yet
      const startDate = new Date(investment.startDate || investment.createdAt);
      const lastCredited = new Date(investment.lastProfitDate || startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Generate all days to credit (from day after lastCredited through today)
      const daysToCreditArray = [];
      let currentDay = new Date(lastCredited);
      currentDay.setDate(currentDay.getDate() + 1);

      while (currentDay <= today) {
        daysToCreditArray.push(new Date(currentDay));
        currentDay.setDate(currentDay.getDate() + 1);
      }

      if (daysToCreditArray.length === 0) {
        console.log(`  ✓ ${investor.name} - Investment $${investment.amount} - No missed days`);
        continue;
      }

      const dailyProfitAmount = Number(((investment.amount * investment.dailyRate) / 100).toFixed(4));
      const totalMissedROI = dailyProfitAmount * daysToCreditArray.length;

      // Credit all missed ROI at once
      await User.findByIdAndUpdate(investor._id, {
        $inc: {
          'wallet.profit': totalMissedROI,
          totalProfitEarned: totalMissedROI
        }
      });

      // Create transaction
      await Transaction.create({
        userId: investor._id,
        type: 'profit',
        amount: totalMissedROI,
        status: 'completed',
        description: `MANUAL CREDIT: Missed daily profit (${daysToCreditArray.length} days × $${dailyProfitAmount}) from investment $${investment.amount}`,
        referenceId: investment._id,
        referenceModel: 'Investment'
      });

      // Update investment record
      await Investment.findByIdAndUpdate(investment._id, {
        $set: { lastProfitDate: today },
        $inc: { totalProfitEarned: totalMissedROI }
      });

      // Notify user
      await Notification.create({
        userId: investor._id,
        title: '🎯 MANUAL CREDIT: Missed Daily Profit',
        message: `You have been credited $${totalMissedROI.toFixed(2)} for ${daysToCreditArray.length} missed days of daily profit at ${(investment.dailyRate * 100).toFixed(4)}%`,
        type: 'profit'
      });

      console.log(`  ✅ ${investor.name} - Credited $${totalMissedROI.toFixed(2)} (${daysToCreditArray.length} days × $${dailyProfitAmount})`);
      stats.roiCredits++;
      stats.roiAmount += totalMissedROI;

    } catch (err) {
      console.error(`  ❌ Error processing investment ${investment._id}:`, err.message);
      stats.errors.push({ investment: investment._id, error: err.message });
    }
  }
}

/**
 * Credit daily ROI for InvestorInvestment model (Phase 1/2/3)
 */
async function creditMissedInvestorROI() {
  console.log('\n📊 PASS 2: Crediting missed daily ROI for InvestorInvestment records...\n');

  const investorInvestments = await InvestorInvestment.find({
    userId: { $ne: null },
    status: 'active'
  }).populate('userId');

  console.log(`Found ${investorInvestments.length} active investor investments to process\n`);

  for (const investment of investorInvestments) {
    try {
      const investor = investment.userId;
      if (!investor || !investor.isActive) continue;

      // Skip test users
      if (investor.name && investor.name.startsWith('Test_Final_')) continue;
      if (investor.email && investor.email.endsWith('@test.com')) continue;

      // Skip if cap already reached
      if (investment.capReached) continue;

      // Calculate all days from startDate to today that haven't been credited yet
      const startDate = new Date(investment.startDate || investment.createdAt);
      const lastCredited = new Date(investment.lastRoiDate || startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Generate all days to credit
      const daysToCreditArray = [];
      let currentDay = new Date(lastCredited);
      currentDay.setDate(currentDay.getDate() + 1);

      while (currentDay <= today) {
        daysToCreditArray.push(new Date(currentDay));
        currentDay.setDate(currentDay.getDate() + 1);
      }

      if (daysToCreditArray.length === 0) {
        console.log(`  ✓ ${investor.name} - Investment $${investment.amount} - No missed days`);
        continue;
      }

      // Determine phase and calculate rate
      const phase = getInvestmentPhase(investment.createdAt);
      let dailyRoiAmount = 0;
      let rateUsed = 0;
      let phaseDescription = '';

      if (phase === 1 || phase === 2) {
        const phaseRate = getDailyRateForPhase(investment.packageNumber, investment.createdAt);
        if (phaseRate && phaseRate > 0) {
          rateUsed = phaseRate;
          dailyRoiAmount = Number(((investment.amount * phaseRate) / 100).toFixed(4));
          phaseDescription = `Phase ${phase} (${phase === 1 ? 'Plan A' : 'Plan B'})`;
        }
      } else if (phase === 3) {
        const monthlyRate = getMonthlyRatePhase3();
        const dailyEquivalent = monthlyRate / 30.44;
        rateUsed = dailyEquivalent;
        dailyRoiAmount = Number(((investment.amount * dailyEquivalent) / 100).toFixed(4));
        phaseDescription = `Phase 3 (Monthly: ${(monthlyRate * 100).toFixed(1)}% → ${(dailyEquivalent * 100).toFixed(4)}% daily)`;
      }

      if (dailyRoiAmount <= 0) {
        console.log(`  ⚠️  ${investor.name} - Investment $${investment.amount} - Invalid rate for phase ${phase}`);
        continue;
      }

      let totalMissedROI = dailyRoiAmount * daysToCreditArray.length;
      let roiToCredit = totalMissedROI;

      // Check if this would exceed income cap
      const projectedTotal = (investment.totalRoiEarned || 0) + totalMissedROI;
      if (projectedTotal > investment.incomeCap) {
        roiToCredit = investment.incomeCap - (investment.totalRoiEarned || 0);
        if (roiToCredit <= 0) {
          console.log(`  ✓ ${investor.name} - Investment cap already reached`);
          continue;
        }
        console.log(`  ⚠️  ${investor.name} - Capping ROI to ${roiToCredit.toFixed(2)} (income cap limit)`);
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
        description: `MANUAL CREDIT: Missed daily ROI (${daysToCreditArray.length} days × $${dailyRoiAmount}) from ${phaseDescription} investment $${investment.amount}`,
        referenceId: investment._id,
        referenceModel: 'InvestorInvestment'
      });

      // Update investment record
      const updateData = {
        $set: { lastRoiDate: today },
        $inc: { totalRoiEarned: roiToCredit }
      };

      if (projectedTotal >= investment.incomeCap) {
        updateData.$set.capReached = true;
        updateData.$set.status = 'completed';
      }

      await InvestorInvestment.findByIdAndUpdate(investment._id, updateData);

      // Notify user
      await Notification.create({
        userId: investor._id,
        title: '🎯 MANUAL CREDIT: Missed Daily ROI',
        message: `You have been credited $${roiToCredit.toFixed(2)} for ${daysToCreditArray.length} missed days of ${phaseDescription} daily ROI`,
        type: 'profit'
      });

      console.log(`  ✅ ${investor.name} - Credited $${roiToCredit.toFixed(2)} (${daysToCreditArray.length} days × $${dailyRoiAmount}) - ${phaseDescription}`);
      stats.roiCredits++;
      stats.roiAmount += roiToCredit;

    } catch (err) {
      console.error(`  ❌ Error processing investor investment ${investment._id}:`, err.message);
      stats.errors.push({ investorInvestment: investment._id, error: err.message });
    }
  }
}

/**
 * Credit 21-level commissions from all active investments
 */
async function creditMissedCommissions() {
  console.log('\n📊 PASS 3: Crediting missed 21-level commissions...\n');

  // Get all active investments
  const investments = await Investment.find({
    isActive: true,
    status: 'active'
  }).populate('userId');

  const investorInvestments = await InvestorInvestment.find({
    userId: { $ne: null },
    status: 'active'
  }).populate('userId');

  const allInvestments = [...investments, ...investorInvestments];
  console.log(`Found ${allInvestments.length} active investments for commission distribution\n`);

  for (const investment of allInvestments) {
    try {
      const investor = investment.userId;
      if (!investor || !investor.ancestorPath || investor.ancestorPath.length === 0) continue;

      // Skip test users
      if (investor.name && investor.name.startsWith('Test_Final_')) continue;
      if (investor.email && investor.email.endsWith('@test.com')) continue;

      // Commission is based on investment amount
      const baseAmount = investment.amount;
      const investmentType = investment.dailyRate ? 'Investment' : 'InvestorInvestment';

      // Distribute to each upline
      for (let i = 0; i < investor.ancestorPath.length; i++) {
        const ancestorId = investor.ancestorPath[i];
        const networkPosition = i + 1;

        try {
          const upline = await User.findById(ancestorId).select('name email isActive totalInvested directCount');

          if (!upline || !upline.isActive) continue;
          if ((upline.totalInvested || 0) <= 0) continue;

          // Determine payout level based on upline's directCount
          let payoutLevel;

          if ((upline.directCount || 0) === 0) {
            continue;
          } else if ((upline.directCount || 0) >= 10) {
            payoutLevel = 1;
          } else {
            payoutLevel = 22 - (upline.directCount * 2);
          }

          // Get rate for this level
          const ratePercent = LEVEL_RATES[payoutLevel - 1];

          if (!ratePercent || ratePercent <= 0) continue;

          // Calculate commission
          const commissionAmount = Number(((baseAmount * ratePercent) / 100).toFixed(4));

          if (commissionAmount <= 0) continue;

          // Check if commission for this investment was already paid
          const existingCommission = await CommissionLog.findOne({
            recipientId: ancestorId,
            sourceUserId: investor._id,
            investmentId: investment._id,
            level: payoutLevel
          });

          if (existingCommission) {
            // Already credited, skip
            continue;
          }

          // Credit commission
          await User.findByIdAndUpdate(ancestorId, {
            $inc: {
              'wallet.commission': commissionAmount,
              totalEarned: commissionAmount
            }
          });

          // Log commission
          await CommissionLog.create({
            recipientId: ancestorId,
            sourceUserId: investor._id,
            investmentId: investment._id,
            level: payoutLevel,
            commissionType: 'level',
            rate: ratePercent,
            baseAmount,
            commissionAmount,
            description: `MANUAL CREDIT: Level ${payoutLevel} commission (${ratePercent}%) from position ${networkPosition}`
          });

          // Create transaction
          await Transaction.create({
            userId: ancestorId,
            type: 'commission',
            amount: commissionAmount,
            status: 'completed',
            description: `MANUAL CREDIT: Level ${payoutLevel} commission (${ratePercent}%) from ${investor.name}'s ${investmentType} investment of $${baseAmount}`,
            referenceId: investment._id,
            referenceModel: investmentType
          });

          // Notify upline
          await Notification.create({
            userId: ancestorId,
            title: '🎯 MANUAL CREDIT: Level Commission',
            message: `You have been credited $${commissionAmount.toFixed(2)} in Level ${payoutLevel} commission from ${investor.name}'s investment!`,
            type: 'commission'
          });

          console.log(`  ✅ Position ${networkPosition} | ${upline.name} - L${payoutLevel} - $${commissionAmount.toFixed(2)} (${ratePercent}%)`);
          stats.commissionCredits++;
          stats.commissionAmount += commissionAmount;

        } catch (err) {
          console.error(`    ❌ Error processing position ${networkPosition}:`, err.message);
          stats.errors.push({ investment: investment._id, position: networkPosition, error: err.message });
        }
      }

    } catch (err) {
      console.error(`  ❌ Error processing investment ${investment._id}:`, err.message);
      stats.errors.push({ investment: investment._id, error: err.message });
    }
  }
}

/**
 * Main function
 */
async function creditMissedPayments() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    console.log('=' .repeat(100));
    console.log('🚀 MANUAL CREDIT: Missed ROI and Commissions');
    console.log('=' .repeat(100));

    await creditMissedInvestmentROI();
    await creditMissedInvestorROI();
    await creditMissedCommissions();

    console.log('\n' + '=' .repeat(100));
    console.log('📊 FINAL SUMMARY');
    console.log('=' .repeat(100));
    console.log(`\n✅ ROI Credits: ${stats.roiCredits} transactions | Total: $${stats.roiAmount.toFixed(2)}`);
    console.log(`✅ Commission Credits: ${stats.commissionCredits} transactions | Total: $${stats.commissionAmount.toFixed(2)}`);
    console.log(`\n💰 TOTAL CREDITED: $${(stats.roiAmount + stats.commissionAmount).toFixed(2)}`);

    if (stats.errors.length > 0) {
      console.log(`\n⚠️  ERRORS: ${stats.errors.length} issues encountered`);
      stats.errors.forEach(err => console.log(`   - ${JSON.stringify(err)}`));
    }

    console.log('\n✅ All missed payments have been credited!\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the script
creditMissedPayments().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
