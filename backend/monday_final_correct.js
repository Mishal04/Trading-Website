const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

function getRoiRate(investment) {
  if (investment >= 10000) return 1.25;
  return 1.00;
}

function getLevelAndRate(unlockedLevels) {
  if (!unlockedLevels || unlockedLevels === 0) return { level: 0, rate: 0 };
  
  // Levels start from L21 going down
  // Lowest level = 22 - unlockedLevels
  const lowestLevel = 22 - unlockedLevels;
  
  let rate = 0;
  if (lowestLevel <= 1) {
    rate = 25; // L1
  } else if (lowestLevel <= 2) {
    rate = 15; // L2
  } else if (lowestLevel <= 3) {
    rate = 10; // L3
  } else if (lowestLevel <= 5) {
    rate = 5; // L4-5
  } else if (lowestLevel <= 10) {
    rate = 2; // L6-10
  } else if (lowestLevel <= 20) {
    rate = 0.9; // L11-20
  } else if (lowestLevel <= 21) {
    rate = 1; // L21
  }
  
  return { level: lowestLevel, rate };
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test');
    
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  MONDAY OCT 14 - FINAL CORRECT EARNINGS (VERIFIED)      ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    const users = [
      { email: 'mohtasham@gmail.com', display: 'MOHTASHAM' },
      { email: 'faisalalimeoalimeo@gmail.com', display: 'FAISAL ASGHAR' },
      { email: 'asadmehmood5142@gmail.com', display: 'ANEES' },
      { email: 'm@gmail.com', display: 'MUSTAQEEM' }
    ];
    
    for (const userData of users) {
      const user = await User.findOne({ email: userData.email });
      if (!user) {
        console.log('✗ ' + userData.display + ' not found\n');
        continue;
      }
      
      const roiRate = getRoiRate(user.totalInvested || 0);
      const dailyROI = ((user.totalInvested || 0) * roiRate) / 100;
      
      const allDownline = await User.find({ ancestorPath: user._id });
      const directDownline = allDownline.filter(d => d.ancestorPath?.length === 1);
      
      let totalLegVolume = 0;
      directDownline.forEach(d => {
        totalLegVolume += (d.totalInvested || 0);
      });
      
      const { level, rate } = getLevelAndRate(user.unlockedLevels || 0);
      const legCommission = (totalLegVolume * rate) / 100;
      const total = dailyROI + legCommission;
      
      console.log('📊 ' + userData.display);
      console.log('   Investment: $' + (user.totalInvested || 0).toFixed(2));
      console.log('   directCount: ' + (user.directCount || 0));
      console.log('   unlockedLevels: ' + (user.unlockedLevels || 0));
      console.log('   ROI Rate: ' + roiRate.toFixed(2) + '%');
      console.log('   Daily ROI: $' + dailyROI.toFixed(2));
      
      if (directDownline.length > 0) {
        console.log('   ');
        console.log('   Direct Referrals (' + directDownline.length + '):');
        directDownline.forEach(d => {
          console.log('     • ' + d.name + ': $' + (d.totalInvested || 0).toFixed(2));
        });
      }
      
      console.log('   ');
      console.log('   Total Leg Volume: $' + totalLegVolume.toFixed(2));
      console.log('   Lowest Level Unlocked: L' + level + ' @ ' + rate + '%');
      console.log('   Leg Commission: $' + legCommission.toFixed(2));
      console.log('   ');
      console.log('   ╔═══════════════════════════════╗');
      console.log('   ║ TOTAL MONDAY: $' + total.toFixed(2).padStart(13) + '      ║');
      console.log('   ╚═══════════════════════════════╝');
      console.log();
    }
    
  } finally {
    process.exit(0);
  }
})();
