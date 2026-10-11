const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test');
    
    const faisal = await User.findOne({ name: 'Faisal' });
    console.log('\nFaisal ID:', faisal._id);
    console.log('Faisal Email:', faisal.email);
    
    // Check people with Faisal in ancestorPath
    const withFaisalAsAncestor = await User.find({ 
      ancestorPath: faisal._id 
    }).select('name ancestorPath');
    
    console.log('\nUsers with Faisal in ancestorPath:', withFaisalAsAncestor.length);
    withFaisalAsAncestor.forEach(u => {
      console.log(`  ${u.name}: ancestorPath length = ${u.ancestorPath?.length}, path = [${u.ancestorPath?.map(id => id.toString().slice(-4)).join(',')}]`);
    });
    
    // Also check by email code
    const byCode = await User.find({ 
      referralCode: 'H6NT5Q58' 
    });
    console.log('\nUsers with referral code H6NT5Q58:', byCode.length);
    
    // Check his referrals using upline field if it exists
    const schemaFields = Object.keys(faisal.schema.obj);
    console.log('\nFaisal document fields:', schemaFields.filter(f => f.includes('up') || f.includes('ref') || f.includes('parent')));
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
})();
