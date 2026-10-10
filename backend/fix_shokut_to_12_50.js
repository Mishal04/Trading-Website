const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI);

async function fixShokut() {
  try {
    await client.connect();
    const db = client.db('test');
    const usersCollection = db.collection('users');

    // Find Shokut
    const user = await usersCollection.findOne({
      email: 'alishoka234@gmail.com'
    });

    if (!user) {
      console.error('Shokut not found');
      return;
    }

    console.log('Before update:');
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`wallet.roi: $${user.wallet?.roi || 0}`);
    console.log(`profitBalance: $${user.profitBalance}`);

    // Update both wallet.roi and profitBalance to $12.50
    const result = await usersCollection.updateOne(
      { email: 'alishoka234@gmail.com' },
      { 
        $set: { 
          'wallet.roi': 12.50,
          profitBalance: 12.50
        } 
      }
    );

    console.log(`\nUpdate result: ${result.modifiedCount} document(s) updated`);

    // Verify the update
    const updated = await usersCollection.findOne({
      email: 'alishoka234@gmail.com'
    });
    console.log('\nAfter update:');
    console.log(`wallet.roi: $${updated.wallet.roi}`);
    console.log(`profitBalance: $${updated.profitBalance}`);
    console.log('✅ Shokut ROI updated to $12.50');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixShokut();
