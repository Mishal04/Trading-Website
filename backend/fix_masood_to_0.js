const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI);

async function fixMasood() {
  try {
    await client.connect();
    const db = client.db('test');
    const usersCollection = db.collection('users');

    // Find Mr Masood
    const user = await usersCollection.findOne({
      email: 'masoodahmad7191@gmail.com'
    });

    if (!user) {
      console.error('Mr Masood not found');
      return;
    }

    console.log('Before update:');
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`wallet.roi: $${user.wallet?.roi || 0}`);
    console.log(`profitBalance: $${user.profitBalance}`);

    // Update both wallet.roi and profitBalance to $0
    const result = await usersCollection.updateOne(
      { email: 'masoodahmad7191@gmail.com' },
      { 
        $set: { 
          'wallet.roi': 0.00,
          profitBalance: 0.00
        } 
      }
    );

    console.log(`\nUpdate result: ${result.modifiedCount} document(s) updated`);

    // Verify the update
    const updated = await usersCollection.findOne({
      email: 'masoodahmad7191@gmail.com'
    });
    console.log('\nAfter update:');
    console.log(`wallet.roi: $${updated.wallet.roi}`);
    console.log(`profitBalance: $${updated.profitBalance}`);
    console.log('✅ Mr Masood ROI updated to $0.00');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixMasood();
