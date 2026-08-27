/**
 * One-time script to manually link existing users under a sponsor.
 *
 * Usage:
 *   node scripts/linkReferrals.js
 *
 * Edit SPONSOR_EMAIL and MEMBER_EMAILS below before running.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

// ── CONFIGURE THESE ──────────────────────────────────────────────────────────
const SPONSOR_EMAIL = 'exoticmishaal9@gmail.com';   // the referrer (your account)

// All users who should appear as downline under the sponsor
const MEMBER_EMAILS = [
  'maryam@gmail.com',
  'ansa@gmail.com',
  'ansa1@gmail.com',
  'esha@gmail.com',
  // add more emails here if needed
];
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  console.log('Connected to MongoDB\n');

  const User = require('../src/models/User');

  // Load sponsor
  const sponsor = await User.findOne({ email: SPONSOR_EMAIL });
  if (!sponsor) {
    console.error('Sponsor not found:', SPONSOR_EMAIL);
    process.exit(1);
  }
  console.log(`Sponsor: ${sponsor.name} (${sponsor.referralCode}) — _id: ${sponsor._id}\n`);

  // Build sponsor's ancestor chain for new members
  // Level 1 under sponsor: ancestorPath = [sponsor._id, ...sponsor.ancestorPath]
  const newAncestorPath = [sponsor._id, ...(sponsor.ancestorPath || [])].slice(0, 25);

  let linked = 0;

  for (const email of MEMBER_EMAILS) {
    const member = await User.findOne({ email });
    if (!member) {
      console.log(`  SKIP — not found: ${email}`);
      continue;
    }
    if (member.referredBy) {
      console.log(`  SKIP — already has referredBy: ${member.name} (${email})`);
      continue;
    }
    if (member._id.toString() === sponsor._id.toString()) {
      console.log(`  SKIP — cannot link sponsor to themselves`);
      continue;
    }

    // Set referredBy and ancestorPath
    await User.findByIdAndUpdate(member._id, {
      referredBy:   sponsor._id,
      ancestorPath: newAncestorPath,
    });

    // Increment sponsor's referral counters
    await User.findByIdAndUpdate(sponsor._id, {
      $inc: {
        'referrals.count':       1,
        'referrals.activeCount': member.totalInvestment > 0 ? 1 : 0,
      },
    });

    console.log(`  LINKED: ${member.name} (${email}) → under ${sponsor.name}`);
    linked++;
  }

  console.log(`\nDone. ${linked} user(s) linked to ${sponsor.name}.`);
  console.log('Go to your Team tab — they will now appear as Level 1 downline.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
