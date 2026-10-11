const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');

const DB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test';

async function checkMustaqeemDownline() {
  try {
    await mongoose.connect(DB_URI);

    const mustaqeem = await User.findOne({ name: 'Mustaqeem' }).select('_id');
    
    const downline = await User.find(
      { ancestorPath: mustaqeem._id },
      { _id: 1, name: 1, totalInvested: 1, wallet: 1 }
    );

    console.log('\nMUSTAQEEM\'S DOWNLINE:\n');
    
    for (const user of downline) {
      console.log(`${user.name}:`);
      console.log(`  totalInvested: $${(user.totalInvested || 0).toFixed(2)}`);
      console.log(`  wallet.roi: $${(user.wallet?.roi || 0).toFixed(2)}`);

      const investments = await InvestorInvestment.find({ userId: user._id })
        .select('amount status totalRoiEarned');
      
      for (const inv of investments) {
        console.log(`  • Investment: $${inv.amount} | ROI earned: $${(inv.totalRoiEarned || 0).toFixed(2)} | ${inv.status}`);
      }
      console.log();
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkMustaqeemDownline();
