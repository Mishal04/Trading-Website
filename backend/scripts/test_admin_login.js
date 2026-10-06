require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const User = require('../src/models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('\n=== Testing Admin Login ===\n');
    
    const adminEmail = 'info.solvex1@gmail.com';
    const passwordsToTry = ['admin123', 'Admin@123', 'test123', 'password', '123456', 'admin', 'solvex123'];
    
    // Find user WITH password selected
    const user = await User.findOne({ email: adminEmail }).select('+password');
    
    if (!user) {
      console.log('❌ Admin user not found');
      process.exit(0);
    }
    
    console.log('Found user:', user.name, user.email);
    console.log('accountType:', user.accountType);
    console.log('isActive:', user.isActive);
    console.log('isVerified:', user.isVerified);
    console.log('\n=== Testing passwords ===\n');
    
    for (const pwd of passwordsToTry) {
      try {
        const isMatch = await user.comparePassword(pwd);
        if (isMatch) {
          console.log(`✅ FOUND: "${pwd}" works!`);
          break;
        } else {
          console.log(`❌ "${pwd}" - no match`);
        }
      } catch (err) {
        console.log(`❌ "${pwd}" - error: ${err.message}`);
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
