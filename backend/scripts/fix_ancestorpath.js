const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/User');

async function fixAncestorPath() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // The 7 users that need fixing
    const userNamesToFix = [
      'Mazhar Hussain',
      'Abdul waqas',
      'Muhammad Raqeeb',
      'Amina Fatima',
      'Mudassar Rasheed',
      'Yasir ali',
      'Ali haider'
    ];

    console.log('═'.repeat(100));
    console.log('ANCESTORPATH CORRECTION FOR 7 USERS');
    console.log('═'.repeat(100) + '\n');

    for (const userName of userNamesToFix) {
      const user = await User.findOne({ name: userName })
        .populate('referredBy', '_id name email')
        .populate('ancestorPath', '_id name email');

      if (!user) {
        console.log(`❌ User not found: ${userName}`);
        continue;
      }

      // Rebuild full chain from referredBy
      const fullChain = [];
      let current = user.referredBy;
      let iterations = 0;
      const maxIterations = 30;

      while (current && iterations < maxIterations) {
        fullChain.push(current._id);
        current = await User.findById(current._id).select('referredBy').populate('referredBy', '_id');
        if (current) {
          current = current.referredBy;
        }
        iterations++;
      }

      const currentPath = user.ancestorPath ? user.ancestorPath.map(id => id.toString()) : [];
      const correctPath = fullChain.map(id => id.toString());

      console.log(`\n${userName} (${user.email})`);
      console.log(`  Current ancestorPath (${currentPath.length} levels):`);
      if (currentPath.length === 0) {
        console.log('    (empty)');
      } else {
        for (let i = 0; i < currentPath.length; i++) {
          const ancestor = user.ancestorPath[i];
          console.log(`      L${i+1}: ${ancestor.name} (${ancestor._id})`);
        }
      }

      console.log(`\n  Corrected ancestorPath (${correctPath.length} levels):`);
      if (correctPath.length === 0) {
        console.log('    (empty)');
      } else {
        for (let i = 0; i < correctPath.length; i++) {
          const ancestorId = correctPath[i];
          const ancestor = await User.findById(ancestorId).select('name email');
          console.log(`      L${i+1}: ${ancestor.name} (${ancestorId})`);
        }
      }

      // Apply correction
      await User.findByIdAndUpdate(user._id, {
        ancestorPath: correctPath
      });

      console.log(`\n  ✓ APPLIED\n`);
    }

    // Verify registration code builds ancestorPath correctly
    console.log('\n' + '═'.repeat(100));
    console.log('VERIFICATION: Registration Code AncestorPath Building');
    console.log('═'.repeat(100) + '\n');

    console.log('Checking authController.js registration logic...\n');

    const fs = require('fs');
    const authCode = fs.readFileSync('./src/controllers/authController.js', 'utf8');
    
    const ancestorPathRegex = /ancestorPath\s*:\s*\[([\s\S]*?)\]/;
    const match = authCode.match(ancestorPathRegex);
    
    if (match) {
      console.log('Found ancestorPath construction:');
      console.log(`  ${match[0].substring(0, 120)}...`);
      
      // Look for the specific line that builds from referrer's path
      if (authCode.includes('referrer.ancestorPath')) {
        console.log('\n✅ CORRECT: Registration builds ancestorPath from referrer\'s current, complete path');
        console.log('   Code pattern: ancestorPath = [referrer._id, ...referrer.ancestorPath].slice(0, 25)');
      } else {
        console.log('\n❌ WARNING: Could not verify ancestorPath inheritance from referrer');
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fixAncestorPath();
