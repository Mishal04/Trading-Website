const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI);

async function predictFaisal() {
  try {
    await client.connect();
    const db = client.db('test');
    const usersCollection = db.collection('users');
    const investmentsCollection = db.collection('investorinvestments');

    // Find Faisal
    const faisal = await usersCollection.findOne({
      email: 'faisalalimeoalimeo@gmail.com'
    });

    if (!faisal) {
      console.error('Faisal not found');
      return;
    }

    console.log('\n' + '='.repeat(80));
    console.log(`FAISAL ASGHAR MONDAY (OCT 14, 2026) 4PM PREDICTION`);
    console.log('='.repeat(80));

    // Get Faisal's investments
    const investments = await investmentsCollection.find({
      userId: faisal._id,
      status: 'active'
    }).toArray();

    console.log(`\n📊 FAISAL PROFILE:`);
    console.log(`   Name: ${faisal.name}`);
    console.log(`   Email: ${faisal.email}`);
    console.log(`   Current ROI Balance: $${faisal.wallet?.roi || 0}`);
    console.log(`   Current Commission Balance: $${faisal.wallet?.commission || 0}`);
    console.log(`   totalInvested: $${faisal.totalInvested}`);
    console.log(`   Direct Referrals (directCount): ${faisal.directCount || 0}`);
    console.log(`   Team Business (total): $${faisal.teamBusiness?.total || 0}`);
    console.log(`   Has ancestorPath?: ${faisal.ancestorPath && faisal.ancestorPath.length > 0 ? 'YES (length: ' + faisal.ancestorPath.length + ')' : 'NO'}`);

    console.log(`\n💰 MONDAY DAILY ROI CALCULATION:`);
    console.log(`   Monday is Oct 14 (weekday) - ROI will be credited`);
    
    let totalDailyROI = 0;
    investments.forEach((inv, idx) => {
      const dailyRate = inv.dailyRate;
      const dailyROI = inv.amount * dailyRate;
      totalDailyROI += dailyROI;
      console.log(`   Investment ${idx + 1}:`);
      console.log(`     Amount: $${inv.amount}`);
      console.log(`     Daily Rate: ${(dailyRate * 100).toFixed(2)}%`);
      console.log(`     Daily ROI: $${inv.amount} × ${(dailyRate * 100).toFixed(2)}% = $${dailyROI.toFixed(2)}`);
    });

    console.log(`   ─────────────────────────────`);
    console.log(`   ✅ MONDAY DAILY ROI: $${totalDailyROI.toFixed(2)}`);

    console.log(`\n📋 MONDAY LEVEL COMMISSIONS:`);
    
    // Get direct referrals to see their investments
    const directReferrals = await usersCollection.find({
      referredBy: faisal._id
    }).project({ name: 1, email: 1, totalInvested: 1 }).toArray();

    console.log(`   Direct Referrals: ${directReferrals.length}`);
    if (directReferrals.length > 0) {
      directReferrals.forEach((ref, idx) => {
        console.log(`     ${idx + 1}. ${ref.name} (${ref.email}) - Invested: $${ref.totalInvested || 0}`);
      });
    }

    console.log(`\n   ✅ Faisal HAS ancestorPath: ${faisal.ancestorPath && faisal.ancestorPath.length > 0 ? 'YES' : 'NO'}`);
    console.log(`   ✅ Monday is a weekday - commissions will run`);
    console.log(`   ✅ Faisal has direct referrals: ${directReferrals.length > 0 ? 'YES' : 'NO'}`);
    
    if (directReferrals.length > 0) {
      // Calculate potential commissions
      const totalDownlineInvested = directReferrals.reduce((sum, ref) => sum + (ref.totalInvested || 0), 0);
      console.log(`\n   Total downline invested: $${totalDownlineInvested}`);
      console.log(`   Level commission rates: 5% (L1), 3% (L2), 2% (L3), etc.`);
      console.log(`   \n   LEVEL 1 Commission (5% from direct referrals):`);
      console.log(`   $${totalDownlineInvested} × 5% = $${(totalDownlineInvested * 0.05).toFixed(2)}`);
      console.log(`   (+ Potential L2+ commissions from downline's downline)`);
      console.log(`   ⚠️  Exact amount depends on full tree calculation`);
    } else {
      console.log(`   ❌ NO COMMISSION (no direct referrals)`);
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`MONDAY TOTAL EARNINGS:`);
    console.log(`   Daily ROI: $${totalDailyROI.toFixed(2)} ✅`);
    if (directReferrals.length > 0) {
      const l1Comm = directReferrals.reduce((sum, ref) => sum + (ref.totalInvested || 0), 0) * 0.05;
      console.log(`   Level 1 Commission: ~$${l1Comm.toFixed(2)} (from direct referrals)`);
      console.log(`   Level 2+ Commission: TBD (depends on full tree)`);
      console.log(`   ─────────────────────────`);
      console.log(`   ESTIMATED TOTAL: $${(totalDailyROI + l1Comm).toFixed(2)}+ (commissions may be higher)`);
    } else {
      console.log(`   Level Commissions: $0.00 (no direct referrals)`);
      console.log(`   ─────────────────────────`);
      console.log(`   TOTAL: $${totalDailyROI.toFixed(2)}`);
    }
    console.log(`${'='.repeat(80)}\n`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

predictFaisal();
