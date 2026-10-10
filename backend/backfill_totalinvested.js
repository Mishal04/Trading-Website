const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI);

async function backfillTotalInvested() {
  try {
    await client.connect();
    const db = client.db('test');
    const usersCollection = db.collection('users');
    const investmentsCollection = db.collection('investorinvestments');

    console.log('🔄 Backfilling totalInvested from investments...\n');

    // Find all users
    const allUsers = await usersCollection.find({}).toArray();

    let updatedCount = 0;
    let skippedCount = 0;

    for (const user of allUsers) {
      // Find all active investments for this user
      const investments = await investmentsCollection.find({
        userId: user._id,
        status: 'active'
      }).toArray();

      if (investments.length === 0) {
        skippedCount++;
        continue;
      }

      // Sum all investment amounts
      const totalInvested = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0);

      // Update user if totalInvested doesn't match
      const currentTotalInvested = user.totalInvested || 0;
      
      if (currentTotalInvested !== totalInvested) {
        await usersCollection.updateOne(
          { _id: user._id },
          { $set: { totalInvested: totalInvested } }
        );

        console.log(`✅ ${user.name} (${user.email})`);
        console.log(`   Old totalInvested: $${currentTotalInvested}`);
        console.log(`   New totalInvested: $${totalInvested}`);
        console.log(`   Active investments: ${investments.length}\n`);
        
        updatedCount++;
      }
    }

    console.log(`\n====================================`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped (no investments): ${skippedCount}`);
    console.log(`====================================`);
    console.log('✅ Backfill complete. Server restart required for changes to take effect.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

backfillTotalInvested();
