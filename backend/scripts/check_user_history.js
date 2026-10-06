require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('=== User History Check ===\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    const Transaction = require('../src/models/Transaction');
    const Notification = require('../src/models/Notification');
    
    const user = await User.findOne({ email: 'orhanahmed11@gmail.com' });
    
    if (!user) {
      console.log('❌ User not found');
      mongoose.disconnect();
      return;
    }
    
    console.log('📋 USER TIMELINE');
    console.log('='.repeat(70));
    console.log(`Email: ${user.email}`);
    console.log(`Created: ${user.createdAt}`);
    console.log(`Last Login: ${user.lastLogin}`);
    console.log(`wallet.capital: $${user.wallet?.capital || 0}`);
    
    // Get all transactions
    const transactions = await Transaction.find({ userId: user._id }).sort({ createdAt: 1 }).limit(20);
    
    console.log(`\n💰 TRANSACTION HISTORY (First 20)`);
    console.log('='.repeat(70));
    
    if (transactions.length === 0) {
      console.log('No transactions found');
    } else {
      transactions.forEach((txn, i) => {
        console.log(`\n[${i + 1}] ${txn.createdAt.toDateString()}`);
        console.log(`    Type: ${txn.type}`);
        console.log(`    Amount: $${txn.amount}`);
        console.log(`    Status: ${txn.status}`);
        console.log(`    Description: ${txn.description}`);
      });
    }
    
    // Get notifications
    const notifications = await Notification.find({ userId: user._id }).sort({ createdAt: -1 }).limit(10);
    
    console.log(`\n\n📢 RECENT NOTIFICATIONS (Last 10)`);
    console.log('='.repeat(70));
    
    if (notifications.length === 0) {
      console.log('No notifications found');
    } else {
      notifications.forEach((notif, i) => {
        console.log(`\n[${i + 1}] ${notif.createdAt.toDateString()}`);
        console.log(`    Title: ${notif.title}`);
        console.log(`    Message: ${notif.message}`);
      });
    }
    
    console.log('\n📌 ANALYSIS');
    console.log('='.repeat(70));
    console.log(`When should ROI have started?`);
    console.log(`  - If capital was deposited at: ${user.createdAt.toDateString()}`);
    console.log(`  - Then ROI should have started: ${new Date(user.createdAt.getTime() + 86400000).toDateString()} (next day)`);
    console.log(`  - Until: yesterday (${new Date(new Date().getTime() - 86400000).toDateString()})`);
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
