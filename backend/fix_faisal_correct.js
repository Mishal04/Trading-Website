const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test');
    
    const faisal = await User.findOne({ name: 'Faisal' });
    console.log('\n=== FAISAL ===');
    console.log('ID:', faisal._id.toString());
    console.log('Email:', faisal.email);
    console.log('Referral Code:', faisal.referralCode);
    console.log('Current directCount:', faisal.directCount);
    console.log('Current unlockedLevels:', faisal.unlockedLevels);
    console.log('Referrals array length:', (faisal.referrals || []).length);
    
    if (faisal.referrals && faisal.referrals.length > 0) {
      console.log('\nDirect Referrals:');
      const directs = await User.find({ _id: { $in: faisal.referrals } });
      directs.forEach(d => {
        console.log(`  - ${d.name} ($${(d.totalInvested || 0).toFixed(2)})`);
      });
      
      const directCount = directs.length;
      const correctUnlockedLevels = directCount * 2;
      
      console.log('\n=== FIX ===');
      console.log('Actual direct count: ' + directCount);
      console.log('Should be unlockedLevels: ' + correctUnlockedLevels);
      
      if (faisal.directCount !== directCount || faisal.unlockedLevels !== correctUnlockedLevels) {
        await User.findByIdAndUpdate(faisal._id, {
          directCount: directCount,
          unlockedLevels: correctUnlockedLevels
        });
        console.log('✓ UPDATED');
      } else {
        console.log('✓ Already correct');
      }
      
      // Calculate Monday earnings
      const sorted = directs.sort((a, b) => (b.totalInvested || 0) - (a.totalInvested || 0));
      const strongestLeg = sorted[0];
      
      console.log('\n=== MONDAY EARNINGS ===');
      console.log('Daily ROI (0.75% of $1000): $7.50');
      
      if (correctUnlockedLevels > 0) {
        let rate = 0;
        if (correctUnlockedLevels >= 11) rate = 0.9;
        else if (correctUnlockedLevels >= 6) rate = 2;
        else if (correctUnlockedLevels >= 4) rate = 5;
        
        const legCommission = ((strongestLeg.totalInvested || 0) * rate) / 100;
        console.log('Strongest leg: ' + strongestLeg.name + ' ($' + (strongestLeg.totalInvested || 0).toFixed(2) + ')');
        console.log('Level: L' + Math.min(correctUnlockedLevels, 20) + ' @ ' + rate + '%');
        console.log('Leg commission: $' + legCommission.toFixed(2));
        console.log('Total: $' + (7.50 + legCommission).toFixed(2));
      }
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
})();
