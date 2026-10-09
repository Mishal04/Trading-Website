require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    const Transaction = require('../src/models/Transaction');
    
    // Find Naveed
    const naveed = await User.findOne({ name: 'Naveed Anjum' });
    
    if (!naveed) {
      console.log('Naveed not found');
      process.exit(1);
    }
    
    console.log(`\nUser: ${naveed.name} (${naveed.email})`);
    console.log(`Current wallet.roi: $${naveed.wallet.roi}`);
    console.log(`\nTransaction History:\n`);
    
    const txs = await Transaction.find({ userId: naveed._id })
      .sort({ createdAt: -1 })
      .limit(20);
    
    txs.forEach(tx => {
      const date = new Date(tx.createdAt).toISOString();
      console.log(`${date}: ${tx.type} | $${tx.amount} | ${tx.description?.substring(0, 60)}...`);
    });
    
    console.log(`\n`);
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
