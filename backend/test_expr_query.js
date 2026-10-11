const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test');
    
    const mustaqeem = await User.findOne({ name: 'Mustaqeem' });
    
    console.log('\nTesting $expr query for Mustaqeem:');
    console.log('Mustaqeem ID:', mustaqeem._id.toString());
    
    // The problematic query
    const result = await User.find({
      $expr: {
        $and: [
          { $in: [mustaqeem._id, '$ancestorPath'] },
          { $eq: [{ $size: '$ancestorPath' }, 1] }
        ]
      }
    });
    
    console.log('\n$expr query result:', result.length);
    result.forEach(r => {
      console.log(`  ${r.name}: ancestorPath=`, r.ancestorPath?.map(id => id.toString().slice(-4)));
    });
    
    // Alternative simpler query
    const result2 = await User.find({
      ancestorPath: { $size: 1, $elemMatch: { $eq: mustaqeem._id } }
    });
    
    console.log('\nAlternative query result:', result2.length);
    
    // Another alternative
    const result3 = await User.aggregate([
      {
        $match: {
          ancestorPath: mustaqeem._id
        }
      },
      {
        $project: {
          name: 1,
          totalInvested: 1,
          ancestorPathLength: { $size: '$ancestorPath' }
        }
      },
      {
        $match: {
          ancestorPathLength: 1
        }
      }
    ]);
    
    console.log('\nAggregation query result:', result3.length);
    result3.forEach(r => {
      console.log(`  ${r.name}: length=${r.ancestorPathLength}`);
    });
    
  } finally {
    process.exit(0);
  }
})();
