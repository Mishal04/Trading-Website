const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('═'.repeat(80));
    console.log('KHALID ACTUAL WALLET STATE');
    console.log('═'.repeat(80) + '\n');

    const khalid = await User.findOne({ name: 'M Khalid' })
      .populate('ancestorPath', '_id name email wallet');

    if (!khalid) {
      console.log('❌ Khalid not found');
      process.exit(1);
    }

    console.log(`User: ${khalid.name} (${khalid.email})\n`);
    console.log('CURRENT WALLET STATE:');
    console.log(`  wallet.capital: $${khalid.wallet?.capital || 0}`);
    console.log(`  wallet.profit: $${khalid.wallet?.profit || 0}`);
    console.log(`  wallet.commission: $${khalid.wallet?.commission || 0}`);
    console.log(`  wallet.roi (old): $${khalid.wallet?.roi || 0}`);
    console.log(`\n`);

    // If capital is $100, calculate ROI
    const capital = khalid.wallet?.capital || 0;
    const dailyRate = 0.01; // 1% for amounts $100-$999
    const dailyRoi = capital * dailyRate;

    console.log('═'.repeat(80));
    console.log('NEW SYSTEM CALCULATION (wallet.capital only):');
    console.log('═'.repeat(80));
    console.log(`\nCapital: $${capital}`);
    console.log(`Daily Rate: ${(dailyRate * 100).toFixed(2)}%`);
    console.log(`Daily ROI: $${capital} × ${(dailyRate * 100).toFixed(2)}% = $${dailyRoi.toFixed(4)}`);
    console.log(`\nROI goes to: wallet.profit`);
    console.log(`\nAFTER TODAY'S CRON RUN:`);
    console.log(`  wallet.capital: $${capital} (unchanged)`);
    console.log(`  wallet.profit: $${(khalid.wallet?.profit || 0) + dailyRoi} (added $${dailyRoi.toFixed(4)})`);
    console.log('\n' + '═'.repeat(80));

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
