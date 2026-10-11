const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');

const DB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test';

async function checkDownlineLegs() {
  try {
    await mongoose.connect(DB_URI);
    console.log('[✓] Connected to MongoDB\n');

    const users = ['Mohtasham', 'Faisal', 'Anees', 'Mustaqeem'];

    for (const name of users) {
      const user = await User.findOne({ name })
        .select('_id name unlockedLevels directCount ancestorPath');
      
      if (!user) {
        console.log(`✗ ${name} not found\n`);
        continue;
      }

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`User: ${name}`);
      console.log(`unlockedLevels: ${user.unlockedLevels || 0}`);
      console.log(`directCount: ${user.directCount || 0}`);
      console.log(`ancestorPath: ${user.ancestorPath?.length || 0} levels`);

      // Find downline
      const downline = await User.find(
        { ancestorPath: user._id },
        { name: 1, totalInvested: 1, email: 1 }
      );

      console.log(`\nDownline count: ${downline.length}`);
      
      if (downline.length > 0) {
        console.log(`Downline members:`);
        let totalDownlineInvestment = 0;
        for (const member of downline) {
          console.log(`  • ${member.name}: $${(member.totalInvested || 0).toFixed(2)}`);
          totalDownlineInvestment += (member.totalInvested || 0);
        }
        console.log(`  Total downline investment: $${totalDownlineInvestment.toFixed(2)}`);
      }

      console.log();
    }

  } catch (err) {
    console.error('✗ Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkDownlineLegs();
