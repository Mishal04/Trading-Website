const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trading');
    
    console.log('\n🔍 ALL USERS WITH COMMISSIONS TODAY (Oct 15)\n');
    
    const today = new Date('2026-10-15');
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get all commission transactions today
    const txs = await Transaction.find({
      type: 'commission',
      date: { $gte: today, $lt: tomorrow },
      description: { $regex: 'profit' }
    }).sort({ userId: 1, amount: -1 });
    
    console.log(`Total profit-based commission transactions: ${txs.length}\n`);
    
    // Group by user
    const byUser = {};
    txs.forEach(tx => {
      if (!byUser[tx.userId]) {
        byUser[tx.userId] = { count: 0, total: 0, txs: [] };
      }
      byUser[tx.userId].count++;
      byUser[tx.userId].total += tx.amount;
      byUser[tx.userId].txs.push({ amount: tx.amount, desc: tx.description });
    });
    
    // Get user names and display
    let userNum = 1;
    for (const userId in byUser) {
      const user = await User.findById(userId).select('name directCount');
      if (user) {
        console.log(`${userNum}. ${user.name}`);
        console.log(`   Transactions: ${byUser[userId].count}`);
        console.log(`   Total: $${byUser[userId].total.toFixed(2)}`);
        console.log(`   Direct Referrals: ${user.directCount || 0}`);
        console.log();
        userNum++;
      }
    }
    
    console.log(`\nTotal Users Paid: ${Object.keys(byUser).length}`);
    
    const totalCommissions = Object.values(byUser).reduce((sum, u) => sum + u.total, 0);
    console.log(`Total Commissions Distributed: $${totalCommissions.toFixed(2)}`);
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
