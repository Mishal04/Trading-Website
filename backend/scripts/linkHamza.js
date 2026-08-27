const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 }).then(async () => {
  const User = require('../src/models/User');

  const sponsor = await User.findOne({ email: 'exoticmishaal9@gmail.com' }).lean();
  const hamza   = await User.findOne({ name: /hamza/i });

  if (!sponsor) { console.log('Sponsor not found'); process.exit(1); }
  if (!hamza)   { console.log('Hamza not found');   process.exit(1); }

  console.log('Sponsor:', sponsor.name, '|', sponsor._id.toString());
  console.log('Member :', hamza.name,   '|', hamza._id.toString());
  console.log('Current referredBy:', hamza.referredBy || 'NULL');

  if (hamza.referredBy) {
    console.log('Already has a referrer — skipping.');
    await mongoose.disconnect();
    return;
  }

  // Build ancestor chain: sponsor is Level 1 parent
  const newAncestorPath = [sponsor._id, ...(sponsor.ancestorPath || [])].slice(0, 25);

  await User.findByIdAndUpdate(hamza._id, {
    referredBy:   sponsor._id,
    ancestorPath: newAncestorPath,
  });

  await User.findByIdAndUpdate(sponsor._id, {
    $inc: {
      'referrals.count':       1,
      'referrals.activeCount': (hamza.totalInvestment || 0) > 0 ? 1 : 0,
    }
  });

  // Verify
  const updated = await User.findById(hamza._id).select('name referredBy ancestorPath').lean();
  console.log('\n--- After update ---');
  console.log('referredBy  :', updated.referredBy.toString());
  console.log('ancestorPath:', updated.ancestorPath.map(x => x.toString()));
  console.log('\nSuccess — Hamza is now linked under', sponsor.name);
  console.log('Refresh the Team tab to see him in your downline.');

  await mongoose.disconnect();
}).catch(e => { console.error('Error:', e.message); process.exit(1); });
