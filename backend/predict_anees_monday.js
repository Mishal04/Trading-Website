const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI);

async function predictAnees() {
  try {
    await client.connect();
    const db = client.db('test');
    const usersCollection = db.collection('users');
    const investmentsCollection = db.collection('investorinvestments');

    // Find Anees
    const anees = await usersCollection.findOne({
      email: 'asadmehmood5142@gmail.com'
    });

    if (!anees) {
      console.error('Anees not found');
      return;
    }

    console.log('\n' + '='.repeat(80));
    console.log(`ANEES MONDAY (OCT 14, 2026) 4PM PREDICTION`);
    console.log('='.repeat(80));

    // Get Anees' investments
    const investments = await investmentsCollection.find({
      userId: anees._id,
      status: 'active'
    }).toArray();

    console.log(`\n📊 ANEES PROFILE:`);
    console.log(`   Name: ${anees.name}`);
    console.log(`   Email: ${anees.email}`);
    console.log(`   Current ROI Balance: $${anees.wallet?.roi || 0}`);
    console.log(`   Current Commission Balance: $${anees.wallet?.commission || 0}`);
    console.log(`   totalInvested: $${anees.totalInvested}`);
    console.log(`   Direct Referrals (directCount): ${anees.directCount || 0}`);
    console.log(`   Has referredBy?: ${anees.referredBy ? 'YES' : 'NO'}`);
    console.log(`   Has ancestorPath?: ${anees.ancestorPath && anees.ancestorPath.length > 0 ? 'YES (length: ' + anees.ancestorPath.length + ')' : 'NO'}`);

    console.log(`\n💰 MONDAY DAILY ROI CALCULATION:`);
    console.log(`   Monday is Oct 14 (weekday) - ROI will be credited`);
    
    let totalDailyROI = 0;
    investments.forEach((inv, idx) => {
      const dailyRate = inv.dailyRate; // Already in decimal (0.01 = 1%)
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
    
    if (!anees.ancestorPath || anees.ancestorPath.length === 0) {
      console.log(`   ❌ NO COMMISSION (ancestorPath empty - no referral chain)`);
      console.log(`   Anees has no uplines, so cannot earn 21-level commissions`);
    } else {
      console.log(`   ✅ Anees HAS ancestorPath (length: ${anees.ancestorPath.length})`);
      console.log(`   Monday is NOT weekend (it's Monday in Dubai timezone too)`);
      console.log(`   ✅ WILL DISTRIBUTE 21-LEVEL COMMISSIONS`);
      console.log(`   ⚠️  But Anees is at the BOTTOM (no direct referrals)`);
      console.log(`   Anees directCount: ${anees.directCount || 0}`);
      console.log(`   → Level commission = percentage of $${anees.totalInvested} investment`);
      console.log(`   → Amount depends on Anees' level in upline's tree`);
      console.log(`   (Need to run distributeLevelCommissionsWithChecks to calculate exact amount)`);
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`MONDAY TOTAL EARNINGS:`);
    console.log(`   Daily ROI: $${totalDailyROI.toFixed(2)} ✅`);
    console.log(`   Level Commissions: $0.00 (no upline to earn from)`);
    console.log(`   ─────────────────────────`);
    console.log(`   TOTAL: $${totalDailyROI.toFixed(2)}`);
    console.log(`${'='.repeat(80)}\n`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

predictAnees();
