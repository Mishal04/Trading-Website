/**
 * remove_one_day_roi.js
 * 
 * Remove one day's worth of ROI from all active investments
 * This reverses today's cron run
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

async function removeOneDay() {
  try {
    console.log('=' .repeat(100));
    console.log('🔄 REMOVE: One day\'s ROI from all active investments');
    console.log('=' .repeat(100) + '\n');

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    // Find all active investments that were updated today
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const activeInvestments = await InvestorInvestment.find({
      status: 'active',
      lastRoiDate: { $gte: startOfToday }
    }).populate('userId', 'name email');

    console.log(`Found ${activeInvestments.length} active investments updated today\n`);

    let totalRemoved = 0;
    const userRemovalMap = {};

    console.log('Calculating one day ROI to remove:\n');

    for (const inv of activeInvestments) {
      const dailyRoiAmount = Number(((inv.amount * inv.dailyRate) / 100).toFixed(4));
      
      const userId = inv.userId._id.toString();
      if (!userRemovalMap[userId]) {
        userRemovalMap[userId] = {
          name: inv.userId.name,
          email: inv.userId.email,
          totalToRemove: 0,
          investmentCount: 0
        };
      }
      
      userRemovalMap[userId].totalToRemove += dailyRoiAmount;
      userRemovalMap[userId].investmentCount++;
      totalRemoved += dailyRoiAmount;
    }

    // Display what will be removed
    Object.values(userRemovalMap).forEach(item => {
      console.log(`${item.name} (${item.email}): -$${item.totalToRemove.toFixed(2)} (${item.investmentCount} investment${item.investmentCount > 1 ? 's' : ''})`);
    });

    console.log(`\nTotal to remove: $${totalRemoved.toFixed(2)}\n`);

    // Apply removals
    console.log('⏳ Removing one day ROI from wallets...\n');

    for (const userId of Object.keys(userRemovalMap)) {
      const removal = userRemovalMap[userId];
      
      await User.findByIdAndUpdate(userId, {
        $inc: {
          'wallet.roi': -removal.totalToRemove,
          totalRoiEarned: -removal.totalToRemove
        }
      });

      console.log(`✅ Removed $${removal.totalToRemove.toFixed(2)} from ${removal.name}`);
    }

    // Reset lastRoiDate to yesterday so they get ROI again tomorrow
    console.log('\n⏳ Resetting lastRoiDate to yesterday for tomorrow\'s run...\n');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const updateResult = await InvestorInvestment.updateMany(
      { status: 'active', lastRoiDate: { $gte: startOfToday } },
      { $set: { lastRoiDate: yesterday } }
    );

    console.log(`✅ Reset ${updateResult.modifiedCount} investments\n`);

    console.log('=' .repeat(100));
    console.log('✅ COMPLETE\n');
    console.log(`Total ROI removed: $${totalRemoved.toFixed(2)}`);
    console.log(`Users affected: ${Object.keys(userRemovalMap).length}`);
    console.log('\n📝 Tomorrow at 4 PM Pakistan time, ROI will run again automatically.\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

removeOneDay().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
