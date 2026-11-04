const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('═'.repeat(100));
    console.log('RESET ALL USERS - PROFIT BALANCE & COMMISSION WALLET TO $0');
    console.log('═'.repeat(100) + '\n');

    // Get all users first to show stats
    const allUsers = await User.find({}).select('_id name email wallet');
    console.log(`Found ${allUsers.length} users\n`);

    let totalProfitBefore = 0;
    let totalCommBefore = 0;
    let usersWithProfit = 0;
    let usersWithComm = 0;

    allUsers.forEach(u => {
      if ((u.wallet?.profit || 0) > 0) {
        usersWithProfit++;
        totalProfitBefore += u.wallet.profit;
      }
      if ((u.wallet?.commission || 0) > 0) {
        usersWithComm++;
        totalCommBefore += u.wallet.commission;
      }
    });

    console.log(`BEFORE:`);
    console.log(`  Users with profit > 0: ${usersWithProfit} (Total: $${totalProfitBefore.toFixed(2)})`);
    console.log(`  Users with commission > 0: ${usersWithComm} (Total: $${totalCommBefore.toFixed(2)})`);
    console.log(`  TOTAL EARNINGS: $${(totalProfitBefore + totalCommBefore).toFixed(2)}\n`);

    console.log('═'.repeat(100));
    console.log('RESETTING ALL WALLETS...\n');

    // Reset all users
    const result = await User.updateMany(
      {},
      {
        $set: {
          'wallet.profit': 0,
          'wallet.commission': 0,
          'totalRoiEarned': 0,
          'totalInvested': 0
        }
      }
    );

    console.log(`✓ Updated ${result.modifiedCount} users\n`);

    // Verify
    const verifyUsers = await User.find({}).select('_id wallet');
    let totalProfitAfter = 0;
    let totalCommAfter = 0;

    verifyUsers.forEach(u => {
      totalProfitAfter += u.wallet?.profit || 0;
      totalCommAfter += u.wallet?.commission || 0;
    });

    console.log('═'.repeat(100));
    console.log('AFTER:');
    console.log('═'.repeat(100));
    console.log(`  Total profit balance: $${totalProfitAfter.toFixed(2)}`);
    console.log(`  Total commission wallet: $${totalCommAfter.toFixed(2)}`);
    console.log(`  TOTAL EARNINGS: $${(totalProfitAfter + totalCommAfter).toFixed(2)}\n`);

    console.log('═'.repeat(100));
    console.log('SUMMARY');
    console.log('═'.repeat(100));
    console.log(`\nProfit Balance cleared: $${totalProfitBefore.toFixed(2)} → $${totalProfitAfter.toFixed(2)}`);
    console.log(`Commission Wallet cleared: $${totalCommBefore.toFixed(2)} → $${totalCommAfter.toFixed(2)}`);
    console.log(`Total cleared: $${(totalProfitBefore + totalCommBefore).toFixed(2)}\n`);
    console.log(`✅ All ${result.modifiedCount} users reset successfully!\n`);
    console.log('═'.repeat(100) + '\n');

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    mongoose.connection.close();
    process.exit(1);
  }
})();
