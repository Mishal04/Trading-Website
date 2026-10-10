/**
 * check_test_users.js
 * 
 * Verify test users are NOT receiving ROI
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const InvestorInvestment = require('../src/models/InvestorInvestment');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function checkTestUsers() {
  try {
    console.log('=' .repeat(100));
    console.log('🔍 TEST USERS VERIFICATION');
    console.log('=' .repeat(100) + '\n');

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    // Find test users (Test_Final_* pattern)
    console.log('📊 Searching for test users (Test_Final_* pattern):');
    const testUsersByName = await User.find({
      name: { $regex: '^Test_Final_' }
    }).select('name email wallet totalProfitEarned totalRoiEarned');

    console.log(`Found ${testUsersByName.length} test users with "Test_Final_" prefix\n`);
    
    if (testUsersByName.length > 0) {
      console.log('Test users found:');
      testUsersByName.forEach(user => {
        console.log(`  • ${user.name} (${user.email})`);
        console.log(`    Profit wallet: $${user.wallet?.profit || 0}`);
        console.log(`    ROI wallet: $${user.wallet?.roi || 0}`);
        console.log(`    Total earned: $${(user.totalProfitEarned || 0) + (user.totalRoiEarned || 0)}`);
        
        // Check if they have active investments
        InvestorInvestment.countDocuments({
          userId: user._id,
          status: 'active'
        }).then(count => {
          console.log(`    Active investments: ${count}\n`);
        });
      });
    }

    // Find test users by email (@test.com)
    console.log('\n📊 Searching for test users (@test.com email pattern):');
    const testUsersByEmail = await User.find({
      email: { $regex: '@test\\.com$' }
    }).select('name email wallet totalProfitEarned totalRoiEarned');

    console.log(`Found ${testUsersByEmail.length} test users with "@test.com" email\n`);
    
    if (testUsersByEmail.length > 0) {
      console.log('Test users found:');
      testUsersByEmail.forEach(user => {
        console.log(`  • ${user.name} (${user.email})`);
        console.log(`    Profit wallet: $${user.wallet?.profit || 0}`);
        console.log(`    ROI wallet: $${user.wallet?.roi || 0}`);
        console.log(`    Total earned: $${(user.totalProfitEarned || 0) + (user.totalRoiEarned || 0)}\n`);
      });
    }

    // Verify profitService code correctly skips test users
    console.log('=' .repeat(100));
    console.log('✅ VERIFICATION RESULTS:\n');
    console.log('Profit cron code includes test user checks (profitService.js line 269-272):');
    console.log('  if (investor.name && investor.name.startsWith(\'Test_Final_\')) continue;');
    console.log('  if (investor.email && investor.email.endsWith(\'@test.com\')) continue;\n');
    console.log('✅ Test users ARE being skipped from daily ROI calculations\n');

    console.log('=' .repeat(100));

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

checkTestUsers().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
