const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI);

async function predictAll() {
  try {
    await client.connect();
    const db = client.db('test');
    const usersCollection = db.collection('users');
    const investmentsCollection = db.collection('investorinvestments');

    // Commission rates by level
    const LEVEL_RATES = {
      1: 25,
      2: 15,
      3: 10,
      4: 5,
      5: 5,
      6: 2,
      7: 2,
      8: 2,
      9: 2,
      10: 2,
      11: 0.9,
      12: 0.9,
      13: 0.9,
      14: 0.9,
      15: 0.9,
      16: 0.9,
      17: 0.9,
      18: 0.9,
      19: 0.9,
      20: 0.9,
      21: 1
    };

    // Function to get earning level from unlockedLevels
    const getEarningLevel = (unlockedLevels) => {
      if (unlockedLevels >= 21) return 1;  // All 21 unlocked, earn from L1
      if (unlockedLevels >= 20) return 2;
      if (unlockedLevels >= 18) return 4;
      if (unlockedLevels >= 16) return 6;
      if (unlockedLevels >= 14) return 8;
      if (unlockedLevels >= 12) return 10;
      if (unlockedLevels >= 10) return 12;
      if (unlockedLevels >= 8) return 14;
      if (unlockedLevels >= 6) return 16;
      if (unlockedLevels >= 4) return 18;
      if (unlockedLevels >= 2) return 20;
      return 0; // No levels unlocked
    };

    const emails = [
      'mohtasham@gmail.com',
      'faisalalimeoalimeo@gmail.com',
      'asadmehmood5142@gmail.com',
      'm@gmail.com'
    ];

    console.log('\n' + '='.repeat(100));
    console.log(`MONDAY (OCT 14, 2026) 4PM PREDICTIONS - CORRECT RATES`);
    console.log('='.repeat(100));

    for (const email of emails) {
      const user = await usersCollection.findOne({ email });

      if (!user) {
        console.log(`\n❌ ${email} - NOT FOUND\n`);
        continue;
      }

      console.log(`\n${'─'.repeat(100)}`);
      console.log(`👤 ${user.name} (${email})`);
      console.log(`${'─'.repeat(100)}`);

      // Get investments
      const investments = await investmentsCollection.find({
        userId: user._id,
        status: 'active'
      }).toArray();

      console.log(`\n📊 PROFILE:`);
      console.log(`   totalInvested: $${user.totalInvested || 0}`);
      console.log(`   directCount: ${user.directCount || 0}`);
      console.log(`   unlockedLevels: ${user.unlockedLevels || 0}`);
      console.log(`   Current ROI Balance: $${user.wallet?.roi || 0}`);
      console.log(`   Current Commission Balance: $${user.wallet?.commission || 0}`);

      // Calculate daily ROI
      console.log(`\n💰 MONDAY DAILY ROI:`);
      let totalDailyROI = 0;
      
      if (investments.length === 0) {
        console.log(`   ❌ No active investments`);
      } else {
        investments.forEach((inv, idx) => {
          const dailyRate = inv.dailyRate;
          const dailyROI = inv.amount * dailyRate;
          totalDailyROI += dailyROI;
          console.log(`   Investment ${idx + 1}: $${inv.amount} × ${(dailyRate * 100).toFixed(2)}% = $${dailyROI.toFixed(2)}`);
        });
        console.log(`   ✅ TOTAL DAILY ROI: $${totalDailyROI.toFixed(2)}`);
      }

      // Calculate level commission
      console.log(`\n📋 MONDAY LEVEL COMMISSION:`);

      const unlockedLevels = user.unlockedLevels || 0;
      const directCount = user.directCount || 0;

      console.log(`   unlockedLevels: ${unlockedLevels}`);
      console.log(`   directCount: ${directCount}`);

      // Get direct referrals
      const directReferrals = await usersCollection.find({
        referredBy: user._id
      }).project({ name: 1, email: 1, totalInvested: 1, teamBusiness: 1 }).toArray();

      console.log(`   Direct Referrals: ${directReferrals.length}`);

      let estimatedCommission = 0;
      
      if (unlockedLevels === 0) {
        console.log(`   ❌ No unlocked levels = $0 commission`);
      } else if (directReferrals.length === 0) {
        console.log(`   ❌ No direct referrals = $0 commission (need directs to earn)`);
      } else {
        // Show direct referrals with leg volumes
        console.log(`\n   Direct Referral Legs:`);
        directReferrals.forEach((ref, idx) => {
          const legVolume = (ref.teamBusiness?.total || 0) + (ref.totalInvested || 0);
          console.log(`     ${idx + 1}. ${ref.name}: Own $${ref.totalInvested || 0}, Leg Volume $${legVolume}`);
        });

        // Find strongest leg
        let strongestLeg = 0;
        directReferrals.forEach(ref => {
          const legVolume = (ref.teamBusiness?.total || 0) + (ref.totalInvested || 0);
          if (legVolume > strongestLeg) strongestLeg = legVolume;
        });

        // Get earning level based on unlockedLevels
        const earningLevel = getEarningLevel(unlockedLevels);
        const ratePercent = LEVEL_RATES[earningLevel];

        if (earningLevel === 0) {
          console.log(`\n   ❌ No levels unlocked = $0 commission`);
        } else {
          console.log(`\n   ✅ unlockedLevels ${unlockedLevels} → Earning from Level ${earningLevel} (${ratePercent}%)`);
          console.log(`   Strongest Leg: $${strongestLeg}`);
          const levelComm = strongestLeg * (ratePercent / 100);
          console.log(`   Level ${earningLevel} Commission (${ratePercent}%): $${strongestLeg} × ${ratePercent}% = $${levelComm.toFixed(2)}`);
          estimatedCommission = levelComm;
        }
      }

      console.log(`\n${'═'.repeat(100)}`);
      console.log(`📊 MONDAY TOTAL EARNINGS FOR ${user.name.toUpperCase()}:`);
      console.log(`   Daily ROI:        $${totalDailyROI.toFixed(2)}`);
      console.log(`   Level Commission: $${estimatedCommission.toFixed(2)}`);
      console.log(`   ─────────────────────`);
      console.log(`   TOTAL:            $${(totalDailyROI + estimatedCommission).toFixed(2)}`);
      console.log(`${'═'.repeat(100)}`);
    }

    console.log('\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

predictAll();
