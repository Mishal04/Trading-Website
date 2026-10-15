const mongoose = require('mongoose');
require('dotenv').config();
const Transaction = require('./src/models/Transaction');
const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trading');
    
    console.log('\n🗑️  FULL DELETE: OCT 15 TRANSACTIONS + REVERSE WALLETS\n');
    
    const oct15Start = new Date('2026-10-15T00:00:00.000Z');
    const oct15End = new Date('2026-10-16T00:00:00.000Z');
    
    // STEP 1: Get all Oct 15 transactions BEFORE deleting
    console.log('1️⃣  Collecting Oct 15 transactions...');
    const txs = await Transaction.find({
      date: { $gte: oct15Start, $lt: oct15End }
    });
    
    console.log(`   Found: ${txs.length} transactions`);
    
    // STEP 2: Calculate total money per user to reverse
    const reversals = {};
    txs.forEach(tx => {
      const userId = tx.userId.toString();
      if (!reversals[userId]) {
        reversals[userId] = { profit: 0, commission: 0, roi: 0 };
      }
      if (tx.type === 'profit') {
        reversals[userId].profit += tx.amount;
      } else if (tx.type === 'commission') {
        reversals[userId].commission += tx.amount;
      } else if (tx.type === 'roi') {
        reversals[userId].roi += tx.amount;
      }
    });
    
    console.log(`\n2️⃣  Reversing wallet amounts...`);
    
    // STEP 3: Reverse wallet balances for each user
    for (const userId in reversals) {
      const amounts = reversals[userId];
      const totalToReverse = amounts.profit + amounts.commission + amounts.roi;
      
      if (totalToReverse > 0) {
        await User.findByIdAndUpdate(userId, {
          $inc: {
            'wallet.profit': -amounts.profit,
            'wallet.commission': -amounts.commission,
            'wallet.roi': -amounts.roi,
            'totalEarned': -totalToReverse
          }
        });
      }
    }
    
    console.log(`   ✅ Reversed wallets for ${Object.keys(reversals).length} users`);
    
    // STEP 4: Delete all Oct 15 transactions
    console.log(`\n3️⃣  Deleting all Oct 15 transactions...`);
    const deleteResult = await Transaction.deleteMany({
      date: { $gte: oct15Start, $lt: oct15End }
    });
    
    console.log(`   ✅ Deleted: ${deleteResult.deletedCount} transactions`);
    
    // STEP 5: Reset lastRoiDate for all investments
    console.log(`\n4️⃣  Resetting investment dates...`);
    const yesterday = new Date('2026-10-14');
    const invResult = await InvestorInvestment.updateMany(
      { status: 'active' },
      { $set: { lastRoiDate: yesterday } }
    );
    
    console.log(`   ✅ Reset: ${invResult.modifiedCount} investments`);
    
    console.log(`\n✅ COMPLETE:`);
    console.log(`   • Oct 15 transactions: DELETED`);
    console.log(`   • Wallet amounts: REVERSED`);
    console.log(`   • System: CLEAN - Ready for fresh start`);
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
