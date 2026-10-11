const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test');
    
    const faisal = await User.findOne({ email: 'faisalalimeoalimeo@gmail.com' });
    console.log('\nFaisal ID:', faisal._id.toString());
    console.log('Faisal directCount:', faisal.directCount);
    
    // His 6 directs from the dashboard
    const directNames = [
      'Sherkhan Rajput',
      'Muhammad Akram',
      'Adil mehmood Arain',
      'Imrana Kouser',
      'Waqas Ali',
      'Muhammad Talha'
    ];
    
    console.log('\nUpdating Faisal\'s 6 direct referrals to have ancestorPath = [Faisal._id]:\n');
    
    for (const name of directNames) {
      const user = await User.findOne({ name });
      if (!user) {
        console.log(`✗ ${name} not found`);
        continue;
      }
      
      console.log(`${name}:`);
      console.log(`  Before: ancestorPath.length = ${user.ancestorPath?.length || 0}`);
      
      // Set ancestorPath to just Faisal (direct referral)
      await User.findByIdAndUpdate(user._id, {
        ancestorPath: [faisal._id]
      });
      
      const updated = await User.findById(user._id);
      console.log(`  After:  ancestorPath.length = ${updated.ancestorPath?.length}`);
    }
    
    // Verify
    console.log('\n\nVerification:');
    const directs = await User.find({ ancestorPath: { $in: [faisal._id] } });
    console.log(`Users with Faisal in ancestorPath: ${directs.length}`);
    
    const l1Directs = directs.filter(d => d.ancestorPath?.length === 1);
    console.log(`L1 direct referrals: ${l1Directs.length}`);
    
    let totalLeg = 0;
    l1Directs.forEach(d => {
      console.log(`  • ${d.name}: $${(d.totalInvested || 0).toFixed(2)}`);
      totalLeg += (d.totalInvested || 0);
    });
    
    console.log(`\nTotal Leg Volume: $${totalLeg.toFixed(2)}`);
    console.log(`Commission at L10 @ 2%: $${(totalLeg * 2 / 100).toFixed(2)}`);
    console.log(`Faisal Monday Total: $3.00 ROI + $${(totalLeg * 2 / 100).toFixed(2)} commission = $${(3 + totalLeg * 2 / 100).toFixed(2)}`);
    
  } finally {
    process.exit(0);
  }
})();
