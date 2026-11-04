/**
 * check_roi_wallets.js
 * 
 * Check which users have ROI wallet balances and investment lastRoiDate updated today
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

async function check() {
  try {
    console.log('=' .repeat(100));
    console.log('📊 ROI WALLETS & INVESTMENT STATUS');
    console.log('=' .repeat(100) + '\n');

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

    console.log(`Checking for investments with lastRoiDate updated today (${startOfToday.toDateString()})\n`);

    // Find investments with lastRoiDate updated today
    const todayInvestments = await InvestorInvestment.find({
      lastRoiDate: {
        $gte: startOfToday,
        $lt: endOfToday
      }
    }).populate('userId', 'name email wallet').limit(20);

    console.log(`Found ${todayInvestments.length} investments with lastRoiDate updated today:\n`);

    const userRoiMap = {};

    todayInvestments.forEach(inv => {
      const userId = inv.userId._id.toString();
      if (!userRoiMap[userId]) {
        userRoiMap[userId] = {
          name: inv.userId.name,
          email: inv.userId.email,
          roiWallet: inv.userId.wallet?.roi || 0,
          investments: []
        };
      }
      userRoiMap[userId].investments.push({
        amount: inv.amount,
        lastRoiDate: inv.lastRoiDate,
        dailyRate: inv.dailyRate
      });
    });

    let totalRoiInWallets = 0;
    Object.values(userRoiMap).forEach(user => {
      const investmentCount = user.investments.length;
      console.log(`${user.name} (${user.email})`);
      console.log(`  ROI wallet: $${user.roiWallet.toFixed(2)}`);
      console.log(`  Active investments updated today: ${investmentCount}`);
      user.investments.forEach(inv => {
        console.log(`    - $${inv.amount} @ ${(inv.dailyRate * 100).toFixed(2)}% daily`);
      });
      console.log();
      totalRoiInWallets += user.roiWallet;
    });

    console.log(`\nTotal ROI in all wallets (for updated investments): $${totalRoiInWallets.toFixed(2)}`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

check().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
