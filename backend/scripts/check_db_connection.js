require('dotenv').config();
const mongoose = require('mongoose');

console.log('=== Database Connection Check ===');
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Connected to MongoDB');
  
  // Check User collection
  const db = mongoose.connection.db;
  const usersCount = await db.collection('users').countDocuments({});
  console.log('Total users:', usersCount);
  
  // Count users with referredBy
  const usersWithReferrals = await db.collection('users').countDocuments({ referredBy: { $ne: null } });
  console.log('Users with referredBy:', usersWithReferrals);
  
  // Get some examples
  if (usersWithReferrals > 0) {
    const examples = await db.collection('users').find({ referredBy: { $ne: null } }).limit(3).toArray();
    console.log('');
    console.log('Example users with referrals:');
    examples.forEach(u => {
      console.log('  - Email:', u.email);
      console.log('    referredBy:', u.referredBy);
      console.log('    ancestorPath:', u.ancestorPath);
      console.log('');
    });
  }
  
  // Check TeamTree collection
  const teamTreeCount = await db.collection('teamtrees').countDocuments({});
  console.log('Total TeamTree records:', teamTreeCount);
  
  // Check if there are any users named 'M Khalid', 'Ghulam Murtza'
  console.log('');
  console.log('Checking for previously mentioned users:');
  const khalid = await db.collection('users').findOne({ $or: [{ email: { $regex: 'khalid', $options: 'i' } }, { firstName: 'M Khalid' }] });
  if (khalid) {
    console.log('  Found M Khalid:', khalid.email);
    console.log('    referredBy:', khalid.referredBy);
  } else {
    console.log('  M Khalid not found');
  }
  
  const ghulam = await db.collection('users').findOne({ $or: [{ email: { $regex: 'ghulam', $options: 'i' } }, { firstName: 'Ghulam Murtza' }] });
  if (ghulam) {
    console.log('  Found Ghulam Murtza:', ghulam.email);
    console.log('    referredBy:', ghulam.referredBy);
  } else {
    console.log('  Ghulam Murtza not found');
  }
  
  mongoose.disconnect();
}).catch(err => {
  console.error('Connection error:', err.message);
  process.exit(1);
});
