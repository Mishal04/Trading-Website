require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('\n=== Resetting Admin Password ===\n');
    
    const adminEmail = process.env.ADMIN_EMAIL || 'info.solvex1@gmail.com';
    const newPassword = process.env.ADMIN_SEED_PASSWORD;

    if (!newPassword) {
      console.error('Error: ADMIN_SEED_PASSWORD environment variable is required.');
      console.error('Usage: ADMIN_SEED_PASSWORD=<your-password> node scripts/reset_admin_password.js');
      process.exit(1);
    }
    
    const user = await User.findOne({ email: adminEmail });
    
    if (!user) {
      console.log('❌ Admin user not found');
      process.exit(0);
    }
    
    console.log('Resetting password for:', user.name, user.email);
    
    // Hash the new password using bcrypt
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the password
    await User.updateOne({ _id: user._id }, { password: hashedPassword });
    
    console.log(`✅ Password reset successfully!`);
    console.log(`\nNew login credentials:`);
    console.log(`  Email: ${adminEmail}`);
    console.log(`  Password: [set from ADMIN_SEED_PASSWORD env var]`);
    // Verify the password works
    const updatedUser = await User.findOne({ email: adminEmail }).select('+password');
    const isMatch = await updatedUser.comparePassword(newPassword);
    console.log(`\n✅ Verification: Password match =`, isMatch);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
