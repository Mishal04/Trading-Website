const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test');
    
    const mustaqeem = await User.findOne({ name: 'Mustaqeem' });
    console.log('\nMustaqeem ID:', mustaqeem._id.toString());
    console.log('Mustaqeem directCount:', mustaqeem.directCount);
    console.log('Mustaqeem unlockedLevels:', mustaqeem.unlockedLevels);
    
    // Method 1: Find by ancestorPath containing Mustaqeem
    const downline1 = await User.find({ ancestorPath: mustaqeem._id });
    console.log('\nMethod 1 - Direct find by ancestorPath:');
    console.log('  Found:', downline1.length);
    downline1.forEach(d => {
      console.log(`    ${d.name}: $${d.totalInvested} | ancestorPath length: ${d.ancestorPath?.length}`);
    });
    
    // Method 2: Using $expr for L1 only
    const downline2 = await User.find({
      $expr: {
        $and: [
          { $in: [mustaqeem._id, '$ancestorPath'] },
          { $eq: [{ $size: '$ancestorPath' }, 1] }
        ]
      }
    });
    console.log('\nMethod 2 - Using $expr for L1 only:');
    console.log('  Found:', downline2.length);
    downline2.forEach(d => {
      console.log(`    ${d.name}: $${d.totalInvested} | ancestorPath length: ${d.ancestorPath?.length}`);
    });
    
    // Calculate totals
    let total1 = 0, total2 = 0;
    downline1.forEach(d => { total1 += (d.totalInvested || 0); });
    downline2.forEach(d => { total2 += (d.totalInvested || 0); });
    
    console.log('\nTotals:');
    console.log('  Method 1 total: $' + total1.toFixed(2));
    console.log('  Method 2 total: $' + total2.toFixed(2));
    console.log('  Expected: $2300.00 (Zain $1200 + jamshed $1100)');
    
    if (total2 < 2300) {
      console.log('\n⚠️  Not all directs found! Check if jamshed/Zain have correct ancestorPath');
      
      // Check Zain and jamshed directly
      const zain = await User.findOne({ name: 'Zain' });
      const jamshed = await User.findOne({ name: 'jamshed' });
      
      if (zain) console.log('\nZain ancestorPath:', zain.ancestorPath?.map(id => id.toString()));
      if (jamshed) console.log('jamshed ancestorPath:', jamshed.ancestorPath?.map(id => id.toString()));
    }
    
  } finally {
    process.exit(0);
  }
})();
