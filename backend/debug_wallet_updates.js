const mongoose = require('mongoose');
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('═'.repeat(100));
    console.log('DEBUG: WALLET UPDATES vs TRANSACTIONS');
    console.log('═'.repeat(100) + '\n');

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get today's transactions
    const todayTxs = await Transaction.find({
      createdAt: { $gte: startOfToday }
    }).select('userId type amount description');

    console.log(`Today's transactions: ${todayTxs.length}\n`);

    // Group by user to see what should be in their wallet
    const expectedByUser = {};
    todayTxs.forEach(tx => {
      if (!expectedByUser[tx.userId]) {
        expectedByUser[tx.userId] = { profit: 0, commission: 0 };
      }
      if (tx.type === 'profit') {
        expectedByUser[tx.userId].profit += tx.amount;
      } else if (tx.type === 'commission') {
        expectedByUser[tx.userId].commission += tx.amount;
      }
    });

    console.log('EXPECTED vs ACTUAL WALLETS:\n');

    let mismatchCount = 0;
    for (const userId in expectedByUser) {
      const user = await User.findById(userId).select('name wallet');
      const expected = expectedByUser[userId];
      const actual = {
        profit: user.wallet?.profit || 0,
        commission: user.wallet?.commission || 0
      };

      if (expected.profit !== actual.profit || expected.commission !== actual.commission) {
        mismatchCount++;
        console.log(`${user.name.padEnd(30)}`);
        console.log(`  Expected: Profit $${expected.profit.toFixed(4)}, Commission $${expected.commission.toFixed(4)}`);
        console.log(`  Actual:   Profit $${actual.profit.toFixed(4)}, Commission $${actual.commission.toFixed(4)}`);
        console.log('');

        if (mismatchCount >= 5) {
          console.log(`... and ${Object.keys(expectedByUser).length - 5} more mismatches\n`);
          break;
        }
      }
    }

    console.log(`Total users with transactions today: ${Object.keys(expectedByUser).length}`);
    console.log(`Users with wallet mismatches: ${mismatchCount}\n`);

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    mongoose.connection.close();
    process.exit(1);
  }
})();
