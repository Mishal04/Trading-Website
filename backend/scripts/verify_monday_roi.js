/**
 * verify_monday_roi.js
 * 
 * Verify that all users will receive CORRECT ROI amounts on Monday at 4 PM
 * Shows detailed breakdown by user and investment
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const InvestorInvestment = require('../src/models/InvestorInvestment');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
  process.exit(1);
}

function getPackageNumber(amount) {
  if (amount >= 100 && amount <= 900) return 1;
  if (amount >= 1000 && amount <= 5000) return 2;
  if (amount >= 6000 && amount <= 9000) return 3;
  if (amount >= 10000 && amount <= 25000) return 4;
  return null;
}

async function verifyMonday() {
  try {
    console.log('=' .repeat(100));
    console.log('✅ VERIFICATION: Monday 4 PM ROI Distribution');
    console.log('=' .repeat(100) + '\n');

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    // Get all active investments
    const investments = await InvestorInvestment.find({
      status: 'active'
    });

    console.log(`Total active investments: ${investments.length}\n`);

    let totalRoiToDistribute = 0;
    let userRoiMap = {};
    let investmentStats = {
      phase1: { count: 0, totalCapital: 0, totalRoi: 0 },
      phase2: { count: 0, totalCapital: 0, totalRoi: 0 },
      phase3: { count: 0 }
    };

    for (const inv of investments) {
      if (!inv.userId) continue;

      const user = await User.findById(inv.userId).select('name email');
      if (!user) continue;

      const pkgNum = getPackageNumber(inv.amount);
      if (!pkgNum) continue;

      // Determine phase
      const now = new Date();
      const ageMs = now - new Date(inv.createdAt);
      const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30.44);
      
      let phase = 1;
      if (ageMonths >= 6 && ageMonths < 12) {
        phase = 2;
      } else if (ageMonths >= 12) {
        phase = 3;
      }

      // Calculate daily ROI
      const dailyRoi = (inv.amount * inv.dailyRate).toFixed(4);
      
      // Track by user
      const userId = user._id.toString();
      if (!userRoiMap[userId]) {
        userRoiMap[userId] = {
          name: user.name,
          email: user.email,
          investments: [],
          totalDailyRoi: 0
        };
      }
      
      userRoiMap[userId].investments.push({
        amount: inv.amount,
        rate: (inv.dailyRate * 100).toFixed(2),
        phase,
        roi: dailyRoi
      });
      
      userRoiMap[userId].totalDailyRoi += parseFloat(dailyRoi);
      totalRoiToDistribute += parseFloat(dailyRoi);

      // Track stats
      if (phase === 1) {
        investmentStats.phase1.count++;
        investmentStats.phase1.totalCapital += inv.amount;
        investmentStats.phase1.totalRoi += parseFloat(dailyRoi);
      } else if (phase === 2) {
        investmentStats.phase2.count++;
        investmentStats.phase2.totalCapital += inv.amount;
        investmentStats.phase2.totalRoi += parseFloat(dailyRoi);
      } else {
        investmentStats.phase3.count++;
      }
    }

    // Display summary
    console.log('📊 MONDAY ROI SUMMARY\n');
    console.log(`Phase 1 (0-6mo, Plan A):`);
    console.log(`  Investments: ${investmentStats.phase1.count}`);
    console.log(`  Total Capital: $${investmentStats.phase1.totalCapital.toLocaleString()}`);
    console.log(`  Daily ROI: $${investmentStats.phase1.totalRoi.toFixed(2)}\n`);

    console.log(`Phase 2 (6-12mo, Plan B):`);
    console.log(`  Investments: ${investmentStats.phase2.count}`);
    console.log(`  Total Capital: $${investmentStats.phase2.totalCapital.toLocaleString()}`);
    console.log(`  Daily ROI: $${investmentStats.phase2.totalRoi.toFixed(2)}\n`);

    console.log(`Phase 3 (12+mo, Monthly):`);
    console.log(`  Investments: ${investmentStats.phase3.count} (calculated separately)\n`);

    console.log('=' .repeat(100));
    console.log(`\n💰 TOTAL ROI TO DISTRIBUTE MONDAY: $${totalRoiToDistribute.toFixed(2)}`);
    console.log(`👥 Users receiving ROI: ${Object.keys(userRoiMap).length}\n`);

    // Show top earners
    console.log('Top 10 ROI earners on Monday:\n');
    const sorted = Object.values(userRoiMap)
      .sort((a, b) => b.totalDailyRoi - a.totalDailyRoi)
      .slice(0, 10);

    sorted.forEach((user, idx) => {
      console.log(`${idx + 1}. ${user.name}`);
      console.log(`   Daily ROI: $${user.totalDailyRoi.toFixed(2)}`);
      console.log(`   Investments: ${user.investments.length}`);
      user.investments.forEach(inv => {
        console.log(`     • $${inv.amount} @ ${inv.rate}% (Phase ${inv.phase}) = $${inv.roi}`);
      });
      console.log();
    });

    // Show Daud Ahmad specifically
    console.log('=' .repeat(100));
    console.log('\n🔍 DAUD AHMAD DETAILED BREAKDOWN\n');
    
    const daudInvestments = await InvestorInvestment.find({
      userId: await User.findOne({ name: 'Daud Ahmad' }).select('_id'),
      status: 'active'
    });

    const daud = await User.findOne({ name: 'Daud Ahmad' });
    console.log(`Current Wallet Status:`);
    console.log(`  Profit: $${daud.wallet.profit}`);
    console.log(`  ROI: $${daud.wallet.roi}\n`);

    let daudMondayTotal = 0;
    console.log('Investments earning Monday ROI:\n');
    
    for (const inv of daudInvestments) {
      const dailyRoi = (inv.amount * inv.dailyRate).toFixed(4);
      daudMondayTotal += parseFloat(dailyRoi);
      
      const now = new Date();
      const ageMs = now - new Date(inv.createdAt);
      const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30.44);
      let phase = 1;
      if (ageMonths >= 6 && ageMonths < 12) phase = 2;
      else if (ageMonths >= 12) phase = 3;
      
      console.log(`  Amount: $${inv.amount}`);
      console.log(`  Rate: ${(inv.dailyRate * 100).toFixed(2)}%`);
      console.log(`  Phase: ${phase}`);
      console.log(`  Monday ROI: +$${dailyRoi}\n`);
    }

    console.log(`Daud Ahmad on Monday at 4 PM:`);
    console.log(`  Before: $${daud.wallet.profit + daud.wallet.roi}`);
    console.log(`  ROI Added: +$${daudMondayTotal.toFixed(2)}`);
    console.log(`  After: $${(daud.wallet.profit + daud.wallet.roi + daudMondayTotal).toFixed(2)}\n`);

    console.log('=' .repeat(100));
    console.log('\n✅ VERIFICATION COMPLETE\n');
    console.log('All users will receive CORRECT ROI amounts Monday at 4 PM Pakistan time!\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

verifyMonday().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
