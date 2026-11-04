/**
 * debug_missing_commissions.js
 * 
 * Check why some downline members aren't getting commissions
 */

const mongoose = require('mongoose');
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');
require('dotenv').config();

async function debug() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Find Muhammadhussain
    const mh = await User.findOne({ name: /muhammadhussain/i });
    
    console.log(`Checking: ${mh.name}\n`);

    // Get downline
    const downline = await User.find({ ancestorPath: mh._id })
      .select('name wallet ancestorPath directCount totalInvested');

    console.log(`Downline: ${downline.length}\n`);

    // Show first 5 members and their ancestorPath
    console.log('First 5 members:');
    for (const member of downline.slice(0, 5)) {
      console.log(`  ${member.name}: ancestorPath.length=${member.ancestorPath?.length}, path=[${member.ancestorPath?.map(id => id.toString().slice(-4)).join(',')}]`);
    }
    console.log();

    // Count by ancestorPath length
    const byLength = {};
    downline.forEach(d => {
      const len = d.ancestorPath?.length || 0;
      byLength[len] = (byLength[len] || 0) + 1;
    });
    console.log('Distribution by ancestorPath length:');
    Object.keys(byLength).sort().forEach(len => {
      console.log(`  Length ${len}: ${byLength[len]} members`);
    });
    console.log();

    // Get L1 members (direct referrals) - users with referredBy === mh._id
    const l1Members = await User.find({ referredBy: mh._id });
    console.log(`L1 members (by referredBy): ${l1Members.length}\n`);

    for (const member of l1Members) {
      const capital = member.wallet?.capital || 0;
      const totalInv = member.totalInvested || 0;
      
      console.log(`${member.name}: wallet.capital=$${capital}, totalInvested=$${totalInv}`);

      // Check if they received any L1 commission
      const l1Comm = await Transaction.findOne({
        description: new RegExp(`L1 commission.*from ${member.name}'s`)
      });

      if (l1Comm) {
        console.log(`  ✓ Got L1 commission: $${l1Comm.amount}`);
      } else {
        console.log(`  ✗ NO L1 commission found`);
      }

      // Check their ROI transaction
      const roi = await Transaction.findOne({
        userId: member._id,
        type: 'profit',
        description: /Daily ROI/
      });

      if (roi) {
        console.log(`  - Generated ROI: $${roi.amount}`);
      } else {
        console.log(`  - NO ROI transaction`);
      }

      console.log();
    }

    mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
    mongoose.connection.close();
    process.exit(1);
  }
}

debug();
