const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI);

async function check() {
  try {
    await client.connect();
    const db = client.db('test');
    const usersCollection = db.collection('users');

    // Find Faisal
    const faisal = await usersCollection.findOne({
      email: 'faisalalimeoalimeo@gmail.com'
    });

    console.log('Faisal Details:');
    console.log(`Name: ${faisal.name}`);
    console.log(`directCount: ${faisal.directCount}`);
    console.log(`unlockedLevels: ${faisal.unlockedLevels}`);

    // Count actual direct referrals
    const directReferrals = await usersCollection.find({
      referredBy: faisal._id
    }).toArray();

    console.log(`\nActual direct referrals in DB: ${directReferrals.length}`);
    directReferrals.forEach((ref, idx) => {
      console.log(`${idx + 1}. ${ref.name} (${ref.email})`);
    });

    console.log(`\n❌ ISSUE: directCount=${faisal.directCount} but actual count=${directReferrals.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

check();
