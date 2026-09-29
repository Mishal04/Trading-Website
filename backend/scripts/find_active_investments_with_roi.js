/**
 * Find active investments with ROI data
 */

const mongoose = require('mongoose');
const User = require('../src/models/User');
const InvestorInvestment = require('../src/models/InvestorInvestment');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
};

const findInvestmentsWithROI = async () => {
  try {
    console.log('\n📊 Finding Active Investments with ROI Data...\n');
    
    // Find active Phase 2 investments (userId-based) with ROI > 0
    const investmentsWithROI = await InvestorInvestment.find({
      userId: { $ne: null },
      status: 'active',
      totalRoiEarned: { $gt: 0 }
    }).populate('userId', 'name email');

    console.log(`Found ${investmentsWithROI.length} active Phase 2 investments with ROI\n`);

    if (investmentsWithROI.length === 0) {
      console.log('⚠️  No active investments with ROI found!');
      console.log('   This could mean:');
      console.log('   1. Cron job hasn\'t run yet (runs at 21:00 Dubai time)');
      console.log('   2. No Phase 2 investments exist');
      console.log('   3. All investments have reached their income cap\n');

      // Check for any active Phase 2 investments
      const allActive = await InvestorInvestment.find({
        userId: { $ne: null },
        status: 'active'
      });

      console.log(`Total active Phase 2 investments (regardless of ROI): ${allActive.length}\n`);

      if (allActive.length > 0) {
        console.log('Sample active investments:');
        allActive.slice(0, 5).forEach(inv => {
          console.log(`  - $${inv.amount} | Created: ${inv.createdAt.toLocaleDateString()} | ROI: $${inv.totalRoiEarned.toFixed(2)} | Cap reached: ${inv.capReached}`);
        });
      }
    } else {
      console.log('✅ Found investments with ROI! Details:\n');
      console.log('┌─────────────────────────────────────────────────────────────┐');
      console.log('│ USER                │ AMOUNT  │ ROI EARNED │ LAST ROI DATE  │');
      console.log('├─────────────────────────────────────────────────────────────┤');

      investmentsWithROI.slice(0, 10).forEach(inv => {
        const userName = inv.userId?.name?.substring(0, 15).padEnd(15) || 'N/A'.padEnd(15);
        const amount = `$${inv.amount}`.padEnd(7);
        const roi = `$${inv.totalRoiEarned.toFixed(2)}`.padEnd(10);
        const lastDate = inv.lastRoiDate?.toLocaleDateString().padEnd(13) || 'N/A'.padEnd(13);
        
        console.log(`│ ${userName} │ ${amount} │ ${roi} │ ${lastDate} │`);
      });
      
      console.log('└─────────────────────────────────────────────────────────────┘');

      // Now check if these users have the ROI in their wallet.roi field
      console.log('\n💰 Checking User Wallet ROI for these investments...\n');

      const userIds = investmentsWithROI.map(inv => inv.userId._id);
      const users = await User.find({ _id: { $in: userIds } }).select('name email wallet totalRoiEarned');

      console.log('┌──────────────────────────────────────┐');
      console.log('│ USER              │ wallet.roi │ TOTAL │');
      console.log('├──────────────────────────────────────┤');

      users.forEach(user => {
        const name = user.name?.substring(0, 15).padEnd(15) || 'N/A'.padEnd(15);
        const walletROI = `$${(user.wallet?.roi || 0).toFixed(2)}`.padEnd(10);
        const totalEarned = `$${(user.totalRoiEarned || 0).toFixed(2)}`;
        
        console.log(`│ ${name} │ ${walletROI} │ ${totalEarned} │`);
      });

      console.log('└──────────────────────────────────────┘');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Connection closed');
  }
};

connectDB().then(() => findInvestmentsWithROI());
