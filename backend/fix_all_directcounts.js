const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI);

async function fixDirectCounts() {
  try {
    await client.connect();
    const db = client.db('test');
    const usersCollection = db.collection('users');

    console.log('🔄 Fixing directCount for all users...\n');

    // Get all users
    const allUsers = await usersCollection.find({}).toArray();

    let fixedCount = 0;
    let noChangeCount = 0;

    for (const user of allUsers) {
      // Count actual direct referrals for this user
      const actualDirectCount = await usersCollection.countDocuments({
        referredBy: user._id
      });

      const currentDirectCount = user.directCount || 0;

      if (currentDirectCount !== actualDirectCount) {
        await usersCollection.updateOne(
          { _id: user._id },
          { $set: { directCount: actualDirectCount } }
        );

        console.log(`✅ ${user.name} (${user.email})`);
        console.log(`   Old directCount: ${currentDirectCount}`);
        console.log(`   New directCount: ${actualDirectCount}\n`);
        
        fixedCount++;
      } else {
        noChangeCount++;
      }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`DIRECTCOUNT FIX COMPLETE`);
    console.log(`Fixed: ${fixedCount}`);
    console.log(`No change needed: ${noChangeCount}`);
    console.log(`Total users: ${allUsers.length}`);
    console.log(`${'='.repeat(80)}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixDirectCounts();
