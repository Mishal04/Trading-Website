const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI);

async function fixMuhammadRizwan() {
  try {
    await client.connect();
    const db = client.db('test');
    const usersCollection = db.collection('users');

    // Find Muhammad Rizwan
    const user = await usersCollection.findOne({
      email: 'stomahelp96@gmail.com'
    });

    if (!user) {
      console.error('Muhammad Rizwan not found');
      return;
    }

    console.log('Before update:');
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`wallet.roi: $${user.wallet?.roi || 0}`);
    console.log(`profitBalance: $${user.profitBalance}`);

    // Update both wallet.roi and profitBalance to $20
    const result = await usersCollection.updateOne(
      { email: 'stomahelp96@gmail.com' },
      { 
        $set: { 
          'wallet.roi': 20.00,
          profitBalance: 20.00
        } 
      }
    );

    console.log(`\nUpdate result: ${result.modifiedCount} document(s) updated`);

    // Verify the update
    const updated = await usersCollection.findOne({
      email: 'stomahelp96@gmail.com'
    });
    console.log('\nAfter update:');
    console.log(`wallet.roi: $${updated.wallet.roi}`);
    console.log(`profitBalance: $${updated.profitBalance}`);
    console.log('✅ Muhammad Rizwan ROI updated to $20.00');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixMuhammadRizwan();
