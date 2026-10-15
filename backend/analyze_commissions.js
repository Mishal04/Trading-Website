/**
 * Analyze commission transactions to understand what's happening
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('./src/models/Transaction');
const CommissionLog = require('./src/models/CommissionLog');
const User = require('./src/models/User');

const analyze = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    console.log(`\n═════════════════════════════════════════════════════════════`);
    console.log(`📊 COMMISSION TRANSACTION ANALYSIS`);
    console.log(`═════════════════════════════════════════════════════════════\n`);

    // Get all commission transactions today
    const allComm = await Transaction.find({
      type: 'commission',
      createdAt: { $gte: startOfToday }
    }).lean().sort({ createdAt: 1 });

    console.log(`Total Transactions: ${allComm.length}\n`);

    // Group by (userId, referenceId) to find duplicates
    const groups = {};

    allComm.forEach(t => {
      const key = `${t.userId}|${t.referenceId}`;  // User receiving commission | source
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(t);
    });

    let duplicateCount = 0;
    const duplicateGroups = [];

    for (const key in groups) {
      if (groups[key].length > 1) {
        duplicateCount += groups[key].length - 1;
        duplicateGroups.push({ key, count: groups[key].length, transactions: groups[key] });
      }
    }

    console.log(`Groups (userId|sourceId): ${Object.keys(groups).length}`);
    console.log(`Duplicate groups: ${duplicateGroups.length}`);
    console.log(`Total duplicate transactions: ${duplicateCount}\n`);

    if (duplicateGroups.length > 0) {
      console.log(`First 10 duplicate groups:\n`);
      for (let i = 0; i < Math.min(10, duplicateGroups.length); i++) {
        const group = duplicateGroups[i];
        const [userId, sourceId] = group.key.split('|');

        const user = await User.findById(userId).select('name');
        const source = await User.findById(sourceId).select('name');

        console.log(`  ${user.name} ← ${source.name}: ${group.count} transactions`);
        group.transactions.forEach((t, idx) => {
          console.log(`    [${idx+1}] $${t.amount.toFixed(4)} created at ${t.createdAt.toLocaleTimeString()}`);
        });
        console.log();
      }
    }

    // Check if same description appears multiple times
    console.log(`\n─────────────────────────────────────────────────────────────`);
    console.log(`Checking for duplicate descriptions:\n`);

    const descCount = {};
    allComm.forEach(t => {
      if (!descCount[t.description]) {
        descCount[t.description] = 0;
      }
      descCount[t.description]++;
    });

    let dupDescs = 0;
    for (const desc in descCount) {
      if (descCount[desc] > 1) {
        dupDescs++;
        console.log(`  [${descCount[desc]}x] "${desc.substring(0, 80)}..."`);
      }
    }

    if (dupDescs === 0) {
      console.log(`  ✓ No duplicate descriptions found`);
    }

    console.log(`\n═════════════════════════════════════════════════════════════\n`);

    process.exit(0);

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

analyze();
