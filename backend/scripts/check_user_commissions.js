const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Transaction = require('../src/models/Transaction');
const constants = require('../config/constants');

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Find the user (assuming info.solvex1@gmail.com or similar admin)
    // Let's find users with high direct counts
    const topUsers = await User.find()
      .sort({ directCount: -1 })
      .limit(5)
      .lean();

    console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
    console.log('║        TOP USERS BY DIRECT REFERRAL COUNT                             ║');
    console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

    for (const user of topUsers) {
      console.log(`Name: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`Direct Referrals: ${user.directCount || 0}`);
      
      const unlockedLevels = constants.getUnlockedLevelNumbers(user.directCount || 0);
      console.log(`Unlocked Levels: [${unlockedLevels.join(', ')}] (${unlockedLevels.length} total)`);
      
      // Get recent commission transactions
      const recentComms = await Transaction.find({ 
        userId: user._id, 
        type: 'commission' 
      })
      .sort({ date: -1 })
      .limit(3)
      .lean();

      if (recentComms.length > 0) {
        console.log(`Recent Commissions:`);
        for (const comm of recentComms) {
          console.log(`  - $${comm.amount} from ${comm.description}`);
        }
      }
      console.log('\n');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkUser();
