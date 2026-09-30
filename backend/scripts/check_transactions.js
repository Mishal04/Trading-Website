require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const Transaction = require('../src/models/Transaction');
const User = require('../src/models/User');

async function check() {
  try {
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/trading-system';
    await mongoose.connect(dbUri);
    
    console.log('\n=== Transaction Analysis ===\n');
    
    // Check for commission transactions
    const commissions = await Transaction.find({ type: 'commission' }).limit(5).lean();
    console.log(`✓ Commission Transactions Found: ${commissions.length}`);
    commissions.forEach(c => {
      console.log(`  - User ID: ${c.userId}, Amount: $${c.amount}, Date: ${c.date}`);
    });
    
    // Check all transaction types
    const types = await Transaction.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    
    console.log(`\n✓ Transaction Types:`);
    types.forEach(t => {
      console.log(`  - ${t._id}: ${t.count} records`);
    });
    
    // Check total
    const total = await Transaction.countDocuments();
    console.log(`\n✓ Total Transactions: ${total}`);
    
    // Check if any user has commissions
    const usersWithCommissions = await Transaction.aggregate([
      { $match: { type: 'commission' } },
      { $group: { _id: '$userId', count: { $sum: 1 }, total: { $sum: '$amount' } } },
      { $limit: 5 }
    ]);
    
    if (usersWithCommissions.length > 0) {
      console.log(`\n✓ Users with Commissions:`);
      for (const uc of usersWithCommissions) {
        const user = await User.findById(uc._id).select('name email').lean();
        console.log(`  - ${user?.name} (${user?.email}): ${uc.count} commissions, Total: $${uc.total.toFixed(2)}`);
      }
    } else {
      console.log('\n✗ No commission transactions found');
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

check();
