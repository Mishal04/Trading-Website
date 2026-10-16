const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const users = await User.find({
      'wallet.commission': { $gt: 0 }
    }).select('name wallet').sort({ 'wallet.commission': -1 }).limit(15);

    console.log(`Users with commissions in wallet: ${users.length}\n`);
    console.log('User Name'.padEnd(30) + ' Commission');
    console.log('─'.repeat(50));

    users.forEach(u => {
      console.log(u.name.padEnd(30) + `$${(u.wallet?.commission || 0).toFixed(2)}`);
    });

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
