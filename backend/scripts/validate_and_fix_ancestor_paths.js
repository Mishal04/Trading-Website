/**
 * validate_and_fix_ancestor_paths.js
 * 
 * PREVENTATIVE MAINTENANCE SCRIPT
 * 
 * Runs periodically (e.g., daily cron) to:
 * 1. Detect any users with broken ancestorPath chains
 * 2. Automatically fix them
 * 3. Log issues for admin review
 * 
 * Run manually: node scripts/validate_and_fix_ancestor_paths.js
 * Or add to cron: 0 2 * * * cd /app/backend && node scripts/validate_and_fix_ancestor_paths.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const validateAndFixAncestorPaths = async () => {
  try {
    console.log('\n' + '═'.repeat(90));
    console.log('🔍 MAINTENANCE: Validate & Fix Ancestor Paths');
    console.log('═'.repeat(90));
    console.log(`Timestamp: ${new Date().toISOString()}\n`);

    await mongoose.connect(process.env.MONGODB_URI);

    // Get ALL users with referrer (non-root users)
    const allUsers = await User.find({ referredBy: { $ne: null } })
      .select('_id name email referredBy ancestorPath totalInvested')
      .lean();

    console.log(`Checking ${allUsers.length} users...\n`);

    const issues = [];
    let fixed = 0;

    for (const user of allUsers) {
      const referrer = await User.findById(user.referredBy)
        .select('ancestorPath')
        .lean();

      if (!referrer) {
        // Orphaned user - referrer deleted
        issues.push({
          userId: user._id,
          name: user.name,
          email: user.email,
          issue: 'Referrer not found (orphaned)',
          severity: 'HIGH'
        });
        continue;
      }

      // Build what ancestorPath SHOULD be
      const correctPath = [user.referredBy, ...(referrer.ancestorPath || [])];

      // Check for mismatch
      const userPathStr = user.ancestorPath?.map(id => id.toString()).join('|') || '';
      const correctPathStr = correctPath.map(id => id.toString()).join('|');

      if (userPathStr !== correctPathStr) {
        // MISMATCH: Fix it
        try {
          await User.findByIdAndUpdate(user._id, {
            ancestorPath: correctPath
          });

          issues.push({
            userId: user._id,
            name: user.name,
            email: user.email,
            issue: 'ancestorPath mismatch (FIXED)',
            severity: 'MEDIUM',
            before_length: user.ancestorPath?.length || 0,
            after_length: correctPath.length
          });

          fixed++;
          console.log(`✓ FIXED: ${user.name} (was ${user.ancestorPath?.length || 0} levels, now ${correctPath.length})`);

        } catch (fixErr) {
          issues.push({
            userId: user._id,
            name: user.name,
            email: user.email,
            issue: `FIX FAILED: ${fixErr.message}`,
            severity: 'CRITICAL'
          });
          console.log(`✗ FAILED TO FIX: ${user.name}`);
        }
      }
    }

    console.log(`\n${'═'.repeat(90)}`);
    console.log(`✅ SUMMARY`);
    console.log(`${'═'.repeat(90)}`);
    console.log(`Total Users Checked:  ${allUsers.length}`);
    console.log(`Issues Found:         ${issues.length}`);
    console.log(`Issues Fixed:         ${fixed}`);
    console.log(`Critical Issues:      ${issues.filter(i => i.severity === 'CRITICAL').length}`);

    if (issues.length > 0) {
      console.log(`\nDETAILS:`);
      issues.forEach(issue => {
        console.log(`\n  ${issue.name} (${issue.email})`);
        console.log(`    Issue: ${issue.issue}`);
        console.log(`    Severity: ${issue.severity}`);
        if (issue.before_length) {
          console.log(`    Path: ${issue.before_length} → ${issue.after_length} levels`);
        }
      });
    } else {
      console.log(`\n✅ All ancestor paths are CORRECT - no issues found!`);
    }

    console.log('\n' + '═'.repeat(90) + '\n');

    await mongoose.connection.close();
    process.exit(0);

  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
};

// Run if executed directly
if (require.main === module) {
  validateAndFixAncestorPaths();
}

module.exports = { validateAndFixAncestorPaths };
