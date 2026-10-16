const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = require('./src/models/User');
  
  const hussain = await User.findOne({ name: { $regex: 'Muhammad.*Hussein|Muhammad.*Hussain|Muhammadhussain', $options: 'i' } })
    .select('_id name wallet');
  
  if (hussain) {
    console.log(`\nUser: ${hussain.name}`);
    console.log(`Wallet Capital: $${hussain.wallet?.capital || 0}`);
    console.log(`Wallet ROI: $${hussain.wallet?.roi || 0}`);
    console.log(`Wallet Commission: $${hussain.wallet?.commission || 0}`);
    console.log(`Wallet Profit: $${hussain.wallet?.profit || 0}`);
    console.log(`Total Earned: $${hussain.totalEarned || 0}`);
    console.log(`Total ROI Earned: $${hussain.totalRoiEarned || 0}\n`);
  }
  
  process.exit(0);
})();
