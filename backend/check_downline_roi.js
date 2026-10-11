const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');

const DB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test';

async function checkDownlineROI() {
  try {
    await mongoose.connect(DB_URI);
    console.log('[✓] Connected to MongoDB\n');

    // Check Mohtasham's downline (Moh)
    console.log('═════════════════════════════════════════');
    console.log('MOHTASHAM\'S DOWNLINE');
    console.log('═════════════════════════════════════════\n');

    const moh = await User.findOne({ name: 'Moh' })
      .select('_id name email totalInvested wallet');
    
    if (moh) {
      console.log(`User: Moh`);
      console.log(`totalInvested: $${(moh.totalInvested || 0).toFixed(2)}`);
      console.log(`wallet.roi: $${(moh.wallet?.roi || 0).toFixed(2)}`);
      console.log(`wallet.commission: $${(moh.wallet?.commission || 0).toFixed(2)}`);

      // Check investments
      const investments = await InvestorInvestment.find({ userId: moh._id })
        .select('amount packageNumber status createdAt totalRoiEarned');
      
      console.log(`\nActive investments: ${investments.length}`);
      for (const inv of investments) {
        console.log(`  • Package ${inv.packageNumber}: $${inv.amount} (Created: ${inv.createdAt.toDateString()})`);
        console.log(`    Total ROI earned: $${(inv.totalRoiEarned || 0).toFixed(2)}`);
        console.log(`    Status: ${inv.status}`);
      }
    }

    // Check Mustaqeem's downline
    console.log('\n═════════════════════════════════════════');
    console.log('MUSTAQEEM\'S DOWNLINE');
    console.log('═════════════════════════════════════════\n');

    const downlineUsers = await User.find(
      { ancestorPath: mongoose.Types.ObjectId(await User.findOne({ name: 'Mustaqeem' }).then(u => u._id)) },
      { _id: 1, name: 1, email: 1, totalInvested: 1, wallet: 1 }
    );

    for (const user of downlineUsers) {
      console.log(`User: ${user.name}`);
      console.log(`totalInvested: $${(user.totalInvested || 0).toFixed(2)}`);
      console.log(`wallet.roi: $${(user.wallet?.roi || 0).toFixed(2)}`);

      const investments = await InvestorInvestment.find({ userId: user._id })
        .select('amount packageNumber status totalRoiEarned');
      
      console.log(`Investments: ${investments.length}`);
      for (const inv of investments) {
        console.log(`  • $${inv.amount} (ROI earned: $${(inv.totalRoiEarned || 0).toFixed(2)})`);
      }
      console.log();
    }

  } catch (err) {
    console.error('✗ Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkDownlineROI();
