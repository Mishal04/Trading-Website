const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const Transaction = require('./src/models/Transaction');
  const User = require('./src/models/User');
  
  const hussain = await User.findOne({ name: { $regex: 'Muhammad.*Hussein|Muhammad.*Hussain', $options: 'i' } }).select('_id name');
  
  console.log('\nRECENT COMMISSIONS RECEIVED BY HUSSAIN:\n');
  
  const txns = await Transaction.find({
    userId: hussain._id,
    type: 'commission'
  })
    .sort({ createdAt: -1 })
    .limit(30)
    .select('amount description createdAt')
    .lean();
  
  let dailyTotal = 0;
  let prevDate = null;
  let count = 0;
  
  for (const txn of txns) {
    const date = txn.createdAt.toISOString().split('T')[0];
    if (prevDate && date !== prevDate) {
      console.log(`Daily total for ${prevDate}: $${dailyTotal.toFixed(2)}\n`);
      dailyTotal = 0;
    }
    console.log(`${txn.createdAt.toISOString()}: $${txn.amount.toFixed(2)} - ${txn.description}`);
    dailyTotal += txn.amount;
    prevDate = date;
    count++;
    if (count >= 25) break;
  }
  
  if (prevDate) {
    console.log(`\nDaily total for ${prevDate}: $${dailyTotal.toFixed(2)}\n`);
  }
  
  process.exit(0);
})();
