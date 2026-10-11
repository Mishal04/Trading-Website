const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test', { 
      serverSelectionTimeoutMS: 5000 
    });
    
    const faisal = await User.findOne({ name: 'Faisal' });
    
    if (!faisal) {
      console.log('Faisal not found');
      process.exit(0);
    }
    
    // Count actual direct referrals
    const directReferrals = await User.countDocuments({ 
      ancestorPath: faisal._id,
      ancestorPath: { $size: 1 } // Only L1 (direct)
    });
    
    // Alternative: count all with faisal as direct upline
    const allDirects = await User.find({ ancestorPath: { $in: [faisal._id] } });
    const directCount = allDirects.filter(u => u.ancestorPath && u.ancestorPath.length === 1).length;
    
    console.log('Faisal Status:');
    console.log('  Before:');
    console.log('    directCount:', faisal.directCount);
    console.log('    unlockedLevels:', faisal.unlockedLevels);
    console.log('\n  Actual direct referrals found:', directCount);
    
    // Update both fields
    const correctUnlockedLevels = directCount * 2;
    
    await User.findByIdAndUpdate(faisal._id, {
      directCount: directCount,
      unlockedLevels: correctUnlockedLevels
    });
    
    console.log('\n  After update:');
    console.log('    directCount:', directCount);
    console.log('    unlockedLevels:', correctUnlockedLevels);
    
    // Get leg info
    const downline = await User.find({ ancestorPath: faisal._id })
      .select('name totalInvested')
      .sort({ totalInvested: -1 });
    
    console.log('\n  Direct referrals:');
    downline.forEach(d => {
      console.log(`    - ${d.name}: $${(d.totalInvested || 0).toFixed(2)}`);
    });
    
    if (downline.length > 0) {
      const strongestLeg = downline[0].totalInvested || 0;
      const rate = 2; // L10 @ 2% for unlockedLevels=12
      const commission = (strongestLeg * rate) / 100;
      
      console.log('\n  Monday earnings:');
      console.log('    Strongest leg: $' + strongestLeg.toFixed(2));
      console.log('    Rate: ' + rate + '% (L10 from unlockedLevels=' + correctUnlockedLevels + ')');
      console.log('    Leg commission: $' + commission.toFixed(2));
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
})();
