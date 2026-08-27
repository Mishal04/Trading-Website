/**
 * One-time migration script.
 *
 * The security update changed verification and password-reset tokens to be
 * stored as SHA-256 hashes instead of plaintext. Any tokens that were saved
 * BEFORE this update are now incompatible — users who click their old email
 * links will get "Invalid or expired token".
 *
 * This script clears all existing plaintext tokens so those users simply
 * request a new link (which will be stored correctly as a hash).
 *
 * Run ONCE after deploying the security update:
 *   node scripts/clearOldTokens.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  .then(async () => {
    const User = require('../src/models/User');

    const result = await User.updateMany(
      {
        $or: [
          { verificationToken: { $exists: true, $ne: null } },
          { resetPasswordToken: { $exists: true, $ne: null } }
        ]
      },
      {
        $unset: {
          verificationToken:        '',
          verificationTokenExpires: '',
          resetPasswordToken:       '',
          resetPasswordExpires:     ''
        }
      }
    );

    console.log(`Cleared tokens for ${result.modifiedCount} user(s).`);
    console.log('Those users will need to request a fresh verification/reset email.');
    await mongoose.disconnect();
  })
  .catch(e => { console.error('Error:', e.message); process.exit(1); });
