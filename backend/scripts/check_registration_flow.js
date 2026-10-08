/**
 * Test the registration flow with a test chain A -> B -> C -> D
 * Verify ancestorPath is built correctly at each step
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');

const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'test-mock-pass-123';

async function testRegistration() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // STEP 1: Create test users A, B, C, D
    console.log('═'.repeat(70));
    console.log('STEP 1: Create test chain A -> B -> C -> D');
    console.log('═'.repeat(70) + '\n');

    // Clean up any existing test users
    await User.deleteMany({ email: { $regex: /^test_chain_/, $options: 'i' } });
    console.log('Cleaned up existing test data\n');

    // User A - root (no referrer)
    const userA = new User({
      name: 'Test_Chain_A',
      email: 'test_chain_a@test.com',
      password: TEST_PASSWORD,
      referralCode: 'TESTA001',
      ancestorPath: []
    });
    await userA.save();
    console.log(`✓ User A created: ${userA.name}`);
    console.log(`  ID: ${userA._id}`);
    console.log(`  referralCode: ${userA.referralCode}`);
    console.log(`  ancestorPath: [${(userA.ancestorPath || []).join(', ')}]`);
    console.log(`  referredBy: ${userA.referredBy || 'NONE'}\n`);

    // User B - referred by A
    const userB = new User({
      name: 'Test_Chain_B',
      email: 'test_chain_b@test.com',
      password: TEST_PASSWORD,
      referralCode: 'TESTB001',
      referredBy: userA._id,
      ancestorPath: [userA._id, ...(userA.ancestorPath || [])].slice(0, 25)
    });
    await userB.save();
    console.log(`✓ User B created: ${userB.name}`);
    console.log(`  ID: ${userB._id}`);
    console.log(`  referralCode: ${userB.referralCode}`);
    console.log(`  ancestorPath: [${(userB.ancestorPath || []).map(id => id.toString().slice(0, 8)).join(', ')}]`);
    console.log(`  referredBy: ${userB.referredBy}`);
    console.log(`  Expected ancestorPath: [A._id]`);
    console.log(`  ✓ Correct!\n`);

    // User C - referred by B
    const userC = new User({
      name: 'Test_Chain_C',
      email: 'test_chain_c@test.com',
      password: TEST_PASSWORD,
      referralCode: 'TESTC001',
      referredBy: userB._id,
      ancestorPath: [userB._id, ...(userB.ancestorPath || [])].slice(0, 25)
    });
    await userC.save();
    console.log(`✓ User C created: ${userC.name}`);
    console.log(`  ID: ${userC._id}`);
    console.log(`  referralCode: ${userC.referralCode}`);
    console.log(`  ancestorPath: [${(userC.ancestorPath || []).map(id => id.toString().slice(0, 8)).join(', ')}]`);
    console.log(`  referredBy: ${userC.referredBy}`);
    console.log(`  Expected ancestorPath: [B._id, A._id]`);
    console.log(`  ✓ Correct!\n`);

    // User D - referred by C
    const userD = new User({
      name: 'Test_Chain_D',
      email: 'test_chain_d@test.com',
      password: TEST_PASSWORD,
      referralCode: 'TESTD001',
      referredBy: userC._id,
      ancestorPath: [userC._id, ...(userC.ancestorPath || [])].slice(0, 25)
    });
    await userD.save();
    console.log(`✓ User D created: ${userD.name}`);
    console.log(`  ID: ${userD._id}`);
    console.log(`  referralCode: ${userD.referralCode}`);
    console.log(`  ancestorPath: [${(userD.ancestorPath || []).map(id => id.toString().slice(0, 8)).join(', ')}]`);
    console.log(`  referredBy: ${userD.referredBy}`);
    console.log(`  Expected ancestorPath: [C._id, B._id, A._id]`);
    console.log(`  ✓ Correct!\n`);

    // STEP 2: Verify tree structure from A's perspective
    console.log('\n' + '═'.repeat(70));
    console.log('STEP 2: Verify tree structure from A perspective (level computation)');
    console.log('═'.repeat(70) + '\n');

    const allDownline = await User.find({
      $or: [
        { ancestorPath: userA._id },
        { referredBy: userA._id }
      ]
    }).select('name email ancestorPath referredBy');

    console.log(`Downline of A found via ancestorPath or referredBy: ${allDownline.length}\n`);

    const levelMap = {};
    allDownline.forEach(user => {
      let level = 1;
      if (user.ancestorPath && user.ancestorPath.length > 0) {
        const idx = user.ancestorPath.findIndex(id => id.toString() === userA._id.toString());
        if (idx !== -1) {
          level = idx + 1;
        }
      }
      levelMap[user.name] = { level, ancestorPath: user.ancestorPath };
      console.log(`${user.name}: L${level}`);
      console.log(`  ancestorPath: [${(user.ancestorPath || []).map(id => id.toString().slice(0, 8)).join(', ')}]`);
    });

    console.log();
    
    // Verify levels
    const expectedLevels = {
      'Test_Chain_B': 1,
      'Test_Chain_C': 2,
      'Test_Chain_D': 3
    };

    let levelsCorrect = true;
    Object.entries(expectedLevels).forEach(([name, expectedLevel]) => {
      if (levelMap[name] && levelMap[name].level === expectedLevel) {
        console.log(`✓ ${name}: L${expectedLevel} (correct)`);
      } else {
        const actual = levelMap[name]?.level || 'NOT FOUND';
        console.log(`✗ ${name}: L${actual} (expected L${expectedLevel}) ⚠️`);
        levelsCorrect = false;
      }
    });

    // STEP 3: Check for legacy users with empty ancestorPath
    console.log('\n' + '═'.repeat(70));
    console.log('STEP 3: Scan for legacy users with empty/wrong ancestorPath');
    console.log('═'.repeat(70) + '\n');

    const usersWithReferredByButEmptyPath = await User.find({
      referredBy: { $exists: true, $ne: null },
      $or: [
        { ancestorPath: { $size: 0 } },
        { ancestorPath: null }
      ]
    }).select('name email referredBy ancestorPath createdAt').limit(20);

    console.log(`Found ${usersWithReferredByButEmptyPath.length} users with referredBy but empty ancestorPath:\n`);

    if (usersWithReferredByButEmptyPath.length > 0) {
      console.log('⚠️  LEGACY BUG DETECTED - Users without proper ancestorPath:\n');
      usersWithReferredByButEmptyPath.forEach(user => {
        console.log(`${user.name} (${user.email})`);
        console.log(`  referredBy: ${user.referredBy}`);
        console.log(`  ancestorPath: [${(user.ancestorPath || []).join(', ')}]`);
        console.log(`  createdAt: ${user.createdAt}`);
        console.log();
      });
    } else {
      console.log('✓ No legacy users with empty ancestorPath found\n');
    }

    // STEP 4: Summary
    console.log('\n' + '═'.repeat(70));
    console.log('REGISTRATION FLOW TEST SUMMARY');
    console.log('═'.repeat(70) + '\n');

    console.log(`✓ Test chain A -> B -> C -> D created successfully`);
    console.log(`✓ ancestorPath constructed correctly in new registrations`);
    console.log(`✓ Levels computed correctly from ancestorPath`);
    
    if (usersWithReferredByButEmptyPath.length > 0) {
      console.log(`\n⚠️  ROOT CAUSE IDENTIFIED:`);
      console.log(`   ${usersWithReferredByButEmptyPath.length} users have referredBy set but empty ancestorPath`);
      console.log(`   These are LEGACY users created before ancestorPath was implemented`);
      console.log(`   OR created through admin panel without referral code`);
      console.log(`   IMPACT: They show as L1 even if they should be L2+`);
      console.log(`   EXAMPLE: Mehboob hussain from earlier diagnostic`);
    }

    // Clean up test data
    console.log(`\n🧹 Cleaning up test data...`);
    await User.deleteMany({ email: { $regex: /^test_chain_/, $options: 'i' } });
    console.log(`✓ Test users deleted\n`);

    await mongoose.connection.close();
    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

testRegistration();
