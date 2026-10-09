const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  try {
    const User = require('../src/models/User');
    const CommissionLog = require('../src/models/CommissionLog');

    console.log('\n🔍 CHECKING: Why Nabeel (billajutt161@gmail.com) doesn\'t have commission logs\n');

    // Find Nabeel
    const nabeel = await User.findOne({ email: 'billajutt161@gmail.com' });
    console.log(`Found: ${nabeel.name} (${nabeel.email})`);
    console.log(`Ancestor Path: ${nabeel.ancestorPath ? nabeel.ancestorPath.length + ' levels' : 'NONE'}`);
    
    if (!nabeel.ancestorPath || nabeel.ancestorPath.length === 0) {
      console.log('\n❌ ISSUE FOUND: User has no ancestorPath (not linked to upline tree)');
      console.log('   → Even though they have 10 direct referrals, they\'re not part of the commission chain');
      console.log('   → Uplines can\'t earn commissions from them because they\'re not in the network tree');
    } else {
      console.log(`\nAncestor Path (Upline Chain):`);
      for (let i = 0; i < Math.min(5, nabeel.ancestorPath.length); i++) {
        const ancestor = await User.findById(nabeel.ancestorPath[i]);
        if (ancestor) {
          console.log(`  Level ${i + 1}: ${ancestor.name}`);
        }
      }
    }

    // Check if any commission logs mention Nabeel as the source
    const commLogsFromNabeel = await CommissionLog.find({ fromUserId: nabeel._id }).limit(5);
    console.log(`\nCommission logs where Nabeel is the source: ${commLogsFromNabeel.length}`);
    if (commLogsFromNabeel.length > 0) {
      commLogsFromNabeel.forEach(log => {
        console.log(`  - L${log.level}: ${log.recipientName} earned $${log.amount}`);
      });
    }

    // Check commissions received by Nabeel
    const commLogsToNabeel = await CommissionLog.find({ recipientId: nabeel._id }).limit(5);
    console.log(`\nCommission logs where Nabeel is recipient: ${commLogsToNabeel.length}`);
    if (commLogsToNabeel.length === 0) {
      console.log('  ❌ NONE - Nabeel should be earning L1 (25%) from all their downline!');
    }

    console.log('\n✅ SOLUTION:');
    console.log('   Nabeel needs to be properly linked to the upline tree via ancestorPath');
    console.log('   This is typically set when they join via referral link');
    console.log('   Current upline should have Nabeel in their downline');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}).catch(err => console.error('Connection error:', err.message));
