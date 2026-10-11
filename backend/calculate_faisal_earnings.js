const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');

const DB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test';

async function calculateFaisalEarnings() {
  try {
    await mongoose.connect(DB_URI);

    const faisal = await User.findOne({ name: 'Faisal' })
      .select('_id name email totalInvested wallet unlockedLevels directCount');
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('FAISAL ASGHAR - MONDAY EARNINGS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('Current Status:');
    console.log(`  Email: ${faisal.email}`);
    console.log(`  totalInvested: $${(faisal.totalInvested || 0).toFixed(2)}`);
    console.log(`  unlockedLevels: ${faisal.unlockedLevels || 0}`);
    console.log(`  directCount: ${faisal.directCount || 0}`);
    console.log(`  Current wallet.roi: $${(faisal.wallet?.roi || 0).toFixed(2)}`);
    console.log(`  Current wallet.commission: $${(faisal.wallet?.commission || 0).toFixed(2)}`);

    // Calculate daily ROI
    // Faisal has $1000 investment at 0.75% daily rate (Phase 2, Plan B)
    const dailyRate = 0.0075; // 0.75%
    const dailyROI = (faisal.totalInvested || 0) * dailyRate;

    console.log(`\n╔════════════════════════════════════════════╗`);
    console.log(`║ MONDAY DAILY ROI                           ║`);
    console.log(`╠════════════════════════════════════════════╣`);
    console.log(`║ Investment: $${(faisal.totalInvested || 0).toFixed(2).padStart(8)}                      ║`);
    console.log(`║ Daily Rate: ${(dailyRate * 100).toFixed(2)}%                         ║`);
    console.log(`║ Daily ROI:  $${dailyROI.toFixed(2).padStart(8)}                      ║`);
    console.log(`╚════════════════════════════════════════════╝\n`);

    // Check leg commission eligibility
    console.log(`╔════════════════════════════════════════════╗`);
    console.log(`║ MONDAY LEG COMMISSION                      ║`);
    console.log(`╠════════════════════════════════════════════╣`);

    if ((faisal.unlockedLevels || 0) === 0) {
      console.log(`║ Status: LOCKED ✗                           ║`);
      console.log(`║ Reason: unlockedLevels = 0                ║`);
      console.log(`║ Commission: $0.00                         ║`);
    } else {
      console.log(`║ Status: UNLOCKED ✓                         ║`);
      console.log(`║ unlockedLevels: ${(faisal.unlockedLevels || 0).toString().padStart(3)}                        ║`);
      console.log(`║ Commission: (based on leg volume)         ║`);
    }

    console.log(`╚════════════════════════════════════════════╝\n`);

    // Get downline to calculate potential leg commission IF unlocked
    const downline = await User.find(
      { ancestorPath: faisal._id },
      { name: 1, totalInvested: 1 }
    ).sort({ totalInvested: -1 });

    if (downline.length > 0) {
      console.log(`Downline Members (${downline.length} total):`);
      let totalLegVolume = 0;
      for (const member of downline) {
        console.log(`  • ${member.name}: $${(member.totalInvested || 0).toFixed(2)}`);
        totalLegVolume += (member.totalInvested || 0);
      }
      console.log(`\n  Total downline volume: $${totalLegVolume.toFixed(2)}`);

      // Strongest leg
      const strongestLeg = downline[0];
      console.log(`  Strongest leg: ${strongestLeg.name} ($${(strongestLeg.totalInvested || 0).toFixed(2)})`);

      if ((faisal.unlockedLevels || 0) > 0) {
        let rate = 0;
        if (faisal.unlockedLevels >= 11) rate = 0.9;
        else if (faisal.unlockedLevels >= 6) rate = 2;
        else if (faisal.unlockedLevels >= 4) rate = 5;
        else if (faisal.unlockedLevels === 3) rate = 10;
        else if (faisal.unlockedLevels === 2) rate = 15;
        else if (faisal.unlockedLevels === 1) rate = 25;

        const legCommission = ((strongestLeg.totalInvested || 0) * rate) / 100;
        console.log(`\n  IF UNLOCKED:`);
        console.log(`  Commission rate (L${faisal.unlockedLevels}): ${rate}%`);
        console.log(`  Leg commission: $${legCommission.toFixed(2)}`);
      }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`MONDAY TOTAL EXPECTED:`);
    console.log(`  Daily ROI: $${dailyROI.toFixed(2)}`);
    console.log(`  Leg Commission: $0.00 (LOCKED)`);
    console.log(`  ────────────────────`);
    console.log(`  TOTAL: $${dailyROI.toFixed(2)}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

calculateFaisalEarnings();
