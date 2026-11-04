const mongoose = require('mongoose');
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get hainga's data
    const hainga = await User.findOne({ name: 'hainga' }).select('_id name wallet');
    
    console.log('HAINGA WALLET:');
    console.log(`  wallet.profit: $${hainga.wallet?.profit || 0}`);
    console.log(`  wallet.commission: $${hainga.wallet?.commission || 0}\n`);

    // Get hainga's transactions today
    const txs = await Transaction.find({
      userId: hainga._id,
      createdAt: { $gte: startOfToday }
    }).select('type amount description');

    console.log(`Hainga's today's transactions: ${txs.length}\n`);
    txs.forEach(tx => {
      console.log(`${tx.type.toUpperCase().padEnd(12)} +$${tx.amount.toFixed(2).padEnd(10)} ${tx.description}`);
    });

    // Calculate expected
    let expectedProfit = 0, expectedComm = 0;
    txs.forEach(tx => {
      if (tx.type === 'profit') expectedProfit += tx.amount;
      if (tx.type === 'commission') expectedComm += tx.amount;
    });

    console.log(`\nEXPECTED: Profit $${expectedProfit.toFixed(2)}, Commission $${expectedComm.toFixed(2)}`);
    console.log(`ACTUAL:   Profit $${(hainga.wallet?.profit || 0).toFixed(2)}, Commission $${(hainga.wallet?.commission || 0).toFixed(2)}\n`);

    if (expectedProfit === (hainga.wallet?.profit || 0) && expectedComm === (hainga.wallet?.commission || 0)) {
      console.log('✅ Wallets match!');
    } else {
      console.log('❌ Wallets DO NOT match');
    }

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
