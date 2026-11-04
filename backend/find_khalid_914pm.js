const mongoose = require('mongoose');
const Transaction = require('./src/models/Transaction');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const khalid = await User.findOne({ email: 'khalid2970935@gmail.com' });
    if (!khalid) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log('All Khalid profit transactions:\n');

    const allTxs = await Transaction.find({
      userId: khalid._id,
      type: 'profit'
    }).sort({ createdAt: -1 });

    allTxs.forEach((t, i) => {
      const date = new Date(t.createdAt).toLocaleString();
      console.log(`${i + 1}. +$${t.amount.toFixed(2)} - ${t.description}`);
      console.log(`   ${date}`);
      console.log(`   ID: ${t._id}\n`);
    });

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
