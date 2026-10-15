/**
 * Simple script to verify no duplicate commissions exist for Oct 15
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('./src/models/Transaction');
const User = require('./src/models/User');

const verify = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const allComm = await Transaction.find({
      type: 'commission',
      createdAt: { $gte: startOfToday }
    });

    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log(`📊 OCT 15 VERIFICATION REPORT`);
    console.log(`═══════════════════════════════════════════════════════════\n`);

    console.log(`Total Commission Transactions: ${allComm.length}`);

    const byUser = {};
    let totalDupes = 0;

    allComm.forEach(t => {
      if (!byUser[t.userId]) byUser[t.userId] = 0;
      byUser[t.userId]++;
    });

    console.log(`\nBreakdown by User:`);
    for (const userId in byUser) {
      const count = byUser[userId];
      const user = await User.findById(userId).select('name');
      if (count > 1) {
        totalDupes += count - 1;
        console.log(`  ⚠️  ${user.name}: ${count} transactions (${count-1} duplicates)`);
      } else {
        console.log(`  ✓ ${user.name}: ${count} transaction`);
      }
    }

    console.log(`\n═══════════════════════════════════════════════════════════`);
    if (totalDupes === 0) {
      console.log(`✅ SUCCESS: No duplicates detected! All transactions are unique.`);
    } else {
      console.log(`❌ FAILURE: ${totalDupes} duplicate transactions found`);
    }
    console.log(`═══════════════════════════════════════════════════════════\n`);

    process.exit(0);

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

verify();
