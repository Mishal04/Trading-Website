const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 }).then(async () => {
  const User = require('../src/models/User');
  const users = await User.find({}).select('name email referralCode referredBy ancestorPath totalInvestment').lean();

  // Build name lookup
  const nameMap = {};
  users.forEach(u => { nameMap[u._id.toString()] = u.name; });

  console.log('\n=== ALL USERS & REFERRAL LINKS ===\n');
  users.forEach(u => {
    const sponsor = u.referredBy ? (nameMap[u.referredBy.toString()] || u.referredBy.toString()) : 'NONE';
    const ancestors = (u.ancestorPath || []).map(id => nameMap[id.toString()] || id.toString());
    console.log(`${u.name} (${u.email})`);
    console.log(`  referredBy  : ${sponsor}`);
    console.log(`  ancestorPath: [${ancestors.join(' → ')}]`);
    console.log(`  invested    : $${u.totalInvestment || 0}`);
    console.log();
  });

  await mongoose.disconnect();
}).catch(e => { console.error('Error:', e.message); process.exit(1); });
