const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI);

async function predictAll() {
  try {
    await client.connect();
    const db = client.db('test');
    const usersCollection = db.collection('users');
    const investmentsCollection = db.collection('investorinvestments');

    const emails = [
      'mohtasham@gmail.com',
      'faisalalimeoalimeo@gmail.com',
      'asadmehmood5142@gmail.com',
      'm@gmail.com'
    ];

    console.log('\n' + '='.repeat(100));
    console.log(`MONDAY (OCT 14, 2026) 4PM PREDICTIONS FOR 4 USERS`);
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

      // Get direct referrals
      const directReferrals = await usersCollection.find({
        referredBy: user._id
      }).project({ name: 1, email: 1, totalInvested: 1, teamBusiness: 1 }).toArray();

      console.log(`   Direct Referrals: ${directReferrals.length}`);

      let estimatedCommission = 0;
      
      if (directReferrals.length === 0) {
        console.log(`   ❌ No direct referrals = $0 commission`);
      } else {
        // Show direct referrals with leg volumes
        console.log(`\n   Direct Referral Legs:`);
        directReferrals.forEach((ref, idx) => {
          const legVolume = (ref.teamBusiness?.total || 0) + (ref.totalInvested || 0);
          console.log(`     ${idx + 1}. ${ref.name}: Own $${ref.totalInvested || 0}, Leg Volume $${legVolume}`);
        });

        // Calculate commission based on directCount and unlockedLevels
        const directCount = user.directCount || 0;
        const unlockedLevels = user.unlockedLevels || 0;

        if (directCount === 0) {
          console.log(`\n   ❌ directCount = 0 → No commission earned`);
        } else if (directCount >= 10) {
          console.log(`\n   ✅ directCount = ${directCount} (≥10) → Level 1 (25%)`);
          // Find strongest leg
          let strongestLeg = 0;
          directReferrals.forEach(ref => {
            const legVolume = (ref.teamBusiness?.total || 0) + (ref.totalInvested || 0);
            if (legVolume > strongestLeg) strongestLeg = legVolume;
          });
          const l1Comm = strongestLeg * 0.25;
          console.log(`   Strongest Leg: $${strongestLeg}`);
          console.log(`   Level 1 Commission (25%): $${strongestLeg} × 25% = $${l1Comm.toFixed(2)}`);
          estimatedCommission = l1Comm;
        } else {
          // Calculate payout level from directCount
          const payoutLevel = 22 - (directCount * 2);
          const LEVEL_RATES = [25, 25, 15, 15, 12, 12, 5, 5, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 0.9, 0.9, 0.9];
          const ratePercent = LEVEL_RATES[payoutLevel - 1];

          console.log(`\n   ✅ directCount = ${directCount} → Level ${payoutLevel} (${ratePercent}%)`);
          
          // Find strongest leg
          let strongestLeg = 0;
          directReferrals.forEach(ref => {
            const legVolume = (ref.teamBusiness?.total || 0) + (ref.totalInvested || 0);
            if (legVolume > strongestLeg) strongestLeg = legVolume;
          });
          const levelComm = strongestLeg * (ratePercent / 100);
          console.log(`   Strongest Leg: $${strongestLeg}`);
          console.log(`   Level ${payoutLevel} Commission (${ratePercent}%): $${strongestLeg} × ${ratePercent}% = $${levelComm.toFixed(2)}`);
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
