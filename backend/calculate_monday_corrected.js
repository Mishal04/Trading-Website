const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

function getRoiRate(investment) {
  if (investment >= 10000) return 1.25;
  return 1.00;
}

function getLevelAndRate(unlockedLevels) {
  if (unlockedLevels === 0) return { level: 0, rate: 0 };
  if (unlockedLevels >= 21) return { level: 21, rate: 1 };
  if (unlockedLevels >= 11) return { level: unlockedLevels, rate: 0.9 };
  if (unlockedLevels >= 6) return { level: unlockedLevels, rate: 2 };
  if (unlockedLevels >= 4) return { level: unlockedLevels, rate: 5 };
  if (unlockedLevels === 3) return { level: 3, rate: 10 };
  if (unlockedLevels === 2) return { level: 20, rate: 0.9 };
  if (unlockedLevels === 1) return { level: 1, rate: 25 };
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test');
    
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║         MONDAY OCT 14 - CORRECTED EARNINGS              ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    const searchNames = ['Mohtasham', 'Faisal', 'Anees', 'Mustaqeem'];
    
    for (const searchName of searchNames) {
      const user = await User.findOne({ name: { $regex: searchName, $options: 'i' } });
      if (!user) {
        console.log('✗ ' + searchName + ' not found\n');
        continue;
      }
      
      // Daily ROI
      const roiRate = getRoiRate(user.totalInvested || 0);
      const dailyROI = ((user.totalInvested || 0) * roiRate) / 100;
      
      // Get direct downline total volume
      const directDownline = await User.find({ 
        $expr: { 
          $and: [
            { $in: [user._id, '$ancestorPath'] },
            { $eq: [{ $size: '$ancestorPath' }, 1] }
          ]
        }
      });
      
      let totalLegVolume = 0;
      directDownline.forEach(d => {
        totalLegVolume += (d.totalInvested || 0);
      });
      
      const { level, rate } = getLevelAndRate(user.unlockedLevels || 0);
      const legCommission = (totalLegVolume * rate) / 100;
      const total = dailyROI + legCommission;
      
      console.log('📊 ' + user.name.toUpperCase());
      console.log('   Investment: $' + (user.totalInvested || 0).toFixed(2));
      console.log('   ROI Rate: ' + roiRate.toFixed(2) + '%');
      console.log('   Daily ROI: $' + dailyROI.toFixed(2));
      console.log('   ');
      console.log('   Direct Referrals: ' + directDownline.length);
      console.log('   Total Leg Volume: $' + totalLegVolume.toFixed(2));
      console.log('   Level: L' + level + ' @ ' + rate + '%');
      console.log('   Leg Commission: $' + legCommission.toFixed(2));
      console.log('   ─────────────────────────');
      console.log('   TOTAL MONDAY: $' + total.toFixed(2) + ' ✓');
      console.log();
    }
    
  } finally {
    process.exit(0);
  }
})();
