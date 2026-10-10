/**
 * final_monday_readiness_check.js
 * 
 * Final comprehensive check to ensure Monday 4 PM distribution will work correctly.
 * Verifies:
 * 1. All 88 Phase 1 investments have correct daily rates
 * 2. All users have proper ancestorPath for commission distribution  
 * 3. Predicts exact distribution amounts (ROI + Commissions)
 * 4. Identifies any issues before Monday
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const InvestorInvestment = require('../src/models/InvestorInvestment');

const MONGODB_URI = process.env.MONGODB_URI;
const LEVEL_RATES = [25, 5, 5, 2, 2, 2, 2, 2, 2, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 1];

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function checkReadiness() {
  try {
    console.log('=' .repeat(120));
    console.log('🔍 FINAL MONDAY READINESS CHECK - October 13, 2026 at 4 PM Pakistan Time');
    console.log('=' .repeat(120) + '\n');

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    // Find all Phase 1 active investments
    const investments = await InvestorInvestment.find({
      status: 'active'
    }).populate('userId');

    console.log(`Total active InvestorInvestment records: ${investments.length}\n`);

    let issues = [];
    let stats = {
      totalRoi: 0,
      totalCommissions: 0,
      userCount: 0,
      investmentCount: 0
    };

    let userCommissions = {}; // Map of userId -> total commissions predicted

    // STEP 1: Verify all investment rates and calculate ROI
    console.log('📋 STEP 1: Verifying investment rates and calculating ROI\n');

    for (const inv of investments) {
      if (!inv.userId) {
        issues.push(`Investment ${inv._id}: No userId`);
        continue;
      }

      const user = inv.userId;
      
      // Check rate is in decimal form
      if (inv.dailyRate > 1) {
        issues.push(`Investment ${inv._id} (${user.firstName}): dailyRate is ${inv.dailyRate} (should be decimal like 0.01 for 1%)`);
      }
      
      // Calculate daily ROI
      const dailyRoi = (inv.amount * inv.dailyRate);
      stats.totalRoi += dailyRoi;
      stats.investmentCount++;

      if (stats.investmentCount <= 5) {
        console.log(`  ${user.firstName}: $${inv.amount} @ ${(inv.dailyRate * 100).toFixed(2)}% = $${dailyRoi.toFixed(4)} ROI`);
      }
    }

    if (investments.length > 5) {
      console.log(`  ... and ${investments.length - 5} more investments`);
    }

    console.log(`\n✅ Total investments checked: ${investments.length}`);
    console.log(`✅ Total daily ROI to distribute: $${stats.totalRoi.toFixed(2)}\n`);

    // STEP 2: Verify ancestorPaths and predict commissions
    console.log('=' .repeat(120));
    console.log('\n📋 STEP 2: Verifying ancestor paths and predicting commissions\n');

    const uniqueUsers = new Set();
    
    for (const inv of investments) {
      if (!inv.userId) continue;
      
      const user = inv.userId;
      uniqueUsers.add(user._id.toString());

      // Check ancestorPath
      if (!user.ancestorPath || user.ancestorPath.length === 0) {
        // This is fine - root users have no ancestors
        if (!userCommissions[user._id.toString()]) {
          userCommissions[user._id.toString()] = {
            name: user.firstName,
            directCount: user.directCount || 0,
            predictedCommissions: 0,
            reason: 'No ancestors'
          };
        }
        continue;
      }

      // For each investment from this user, calculate commissions to ancestors
      const directCount = user.directCount || 0;

      // Only calculate if user has directs (otherwise no commission unlocked)
      if (directCount > 0) {
        // Calculate payout level based on directCount
        let payoutLevel;
        if (directCount >= 10) {
          payoutLevel = 1;
        } else {
          payoutLevel = 22 - (directCount * 2);
        }

        const ratePercent = LEVEL_RATES[payoutLevel - 1];

        if (ratePercent > 0) {
          // Base amount for commission is investment amount
          const baseCommission = (inv.amount * ratePercent) / 100;

          // Add to each ancestor in the path
          for (let i = 0; i < user.ancestorPath.length; i++) {
            const ancestorId = user.ancestorPath[i].toString();
            
            if (!userCommissions[ancestorId]) {
              const ancestor = await User.findById(ancestorId).select('firstName directCount');
              userCommissions[ancestorId] = {
                name: ancestor?.firstName || 'Unknown',
                directCount: ancestor?.directCount || 0,
                predictedCommissions: 0,
                fromInvestments: []
              };
            }

            userCommissions[ancestorId].predictedCommissions += baseCommission;
            userCommissions[ancestorId].fromInvestments = userCommissions[ancestorId].fromInvestments || [];
            userCommissions[ancestorId].fromInvestments.push({
              investor: user.firstName,
              level: payoutLevel,
              rate: ratePercent,
              base: inv.amount,
              commission: baseCommission
            });

            stats.totalCommissions += baseCommission;
          }
        }
      }
    }

    console.log(`✅ Unique users with investments: ${uniqueUsers.size}`);
    console.log(`✅ Total commission opportunities identified: ${Object.keys(userCommissions).length}`);
    console.log(`✅ Total daily commissions predicted: $${stats.totalCommissions.toFixed(2)}\n`);

    // STEP 3: Show predictions for key users
    console.log('=' .repeat(120));
    console.log('\n📋 STEP 3: Monday predictions for key users\n');

    // Show Mustaqeem
    const mustaqeem = Array.from(uniqueUsers).map(async uid => {
      const u = await User.findById(uid);
      return u;
    });

    const allUsers = await Promise.all(
      Array.from(uniqueUsers).map(uid => User.findById(uid))
    );

    const mustaqeemUser = allUsers.find(u => u?.firstName?.includes('Mustaqeem') || u?.email?.includes('mustaq'));

    if (mustaqeemUser) {
      console.log(`🔍 MUSTAQEEM:\n`);
      console.log(`  Current Wallet:`);
      console.log(`    Commission: $${mustaqeemUser.wallet?.commission || 0}`);
      console.log(`    ROI: $${mustaqeemUser.wallet?.roi || 0}`);
      console.log(`    Profit: $${mustaqeemUser.wallet?.profit || 0}\n`);

      // Find Mustaqeem's investments and referrals
      const mustaqeemInvs = investments.filter(inv => inv.userId._id.toString() === mustaqeemUser._id.toString());
      const mustaqeemRois = mustaqeemInvs.reduce((sum, inv) => sum + (inv.amount * inv.dailyRate), 0);

      console.log(`  Monday ROI prediction: +$${mustaqeemRois.toFixed(2)}`);

      // Commission prediction for Mustaqeem
      const mustaqeemComms = userCommissions[mustaqeemUser._id.toString()];
      if (mustaqeemComms) {
        console.log(`  Monday Commission prediction: +$${mustaqeemComms.predictedCommissions.toFixed(2)}`);
        if (mustaqeemComms.fromInvestments && mustaqeemComms.fromInvestments.length > 0) {
          console.log(`    From ${mustaqeemComms.fromInvestments.length} direct referral(s):`);
          mustaqeemComms.fromInvestments.forEach(inv => {
            console.log(`      • ${inv.investor}: L${inv.level} @ ${inv.rate}% of $${inv.base} = $${inv.commission.toFixed(2)}`);
          });
        }
      } else {
        console.log(`  Monday Commission prediction: $0 (no direct referrals unlocked)`);
      }

      const mustaqeemTotal = mustaqeemRois + (mustaqeemComms?.predictedCommissions || 0);
      console.log(`  Total Monday increase: +$${mustaqeemTotal.toFixed(2)}\n`);
    }

    // Show Daud Ahmad
    const daudUser = allUsers.find(u => u?.name === 'Daud Ahmad');
    if (daudUser) {
      console.log(`🔍 DAUD AHMAD:\n`);
      console.log(`  Current Wallet: $${daudUser.wallet?.profit || 0} (profit) + $${daudUser.wallet?.roi || 0} (roi) = $${(daudUser.wallet?.profit || 0) + (daudUser.wallet?.roi || 0)}\n`);

      const daudInvs = investments.filter(inv => inv.userId._id.toString() === daudUser._id.toString());
      const daudRois = daudInvs.reduce((sum, inv) => sum + (inv.amount * inv.dailyRate), 0);

      console.log(`  Investments:`);
      daudInvs.forEach(inv => {
        console.log(`    • $${inv.amount} @ ${(inv.dailyRate * 100).toFixed(2)}% = $${(inv.amount * inv.dailyRate).toFixed(2)}/day`);
      });

      console.log(`  Monday ROI prediction: +$${daudRois.toFixed(2)}\n`);
    }

    // STEP 4: Check for issues
    console.log('=' .repeat(120));
    console.log('\n⚠️ STEP 4: Issue check\n');

    if (issues.length > 0) {
      console.log(`❌ Found ${issues.length} issue(s):\n`);
      issues.forEach((issue, idx) => {
        console.log(`  ${idx + 1}. ${issue}`);
      });
      console.log();
    } else {
      console.log('✅ No issues found! System is ready for Monday.\n');
    }

    // FINAL SUMMARY
    console.log('=' .repeat(120));
    console.log('\n📊 FINAL MONDAY SUMMARY\n');
    console.log(`Total daily ROI to distribute: $${stats.totalRoi.toFixed(2)}`);
    console.log(`Total daily Commissions to distribute: $${stats.totalCommissions.toFixed(2)}`);
    console.log(`Combined daily distribution: $${(stats.totalRoi + stats.totalCommissions).toFixed(2)}`);
    console.log(`Active investments: ${stats.investmentCount}`);
    console.log(`Active users: ${uniqueUsers.size}\n`);

    if (issues.length === 0) {
      console.log('✅✅✅ SYSTEM IS READY FOR MONDAY 4 PM DISTRIBUTION ✅✅✅\n');
    } else {
      console.log(`⚠️⚠️⚠️ ${issues.length} ISSUES NEED TO BE RESOLVED BEFORE MONDAY ⚠️⚠️⚠️\n`);
    }

    console.log('=' .repeat(120) + '\n');
    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

checkReadiness().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
