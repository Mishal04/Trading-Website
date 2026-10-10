const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI);

async function fixRizwan() {
  try {
    await client.connect();
    const db = client.db('test');
    const usersCollection = db.collection('users');

    // Find Rizwan Shahid
    const rizwan = await usersCollection.findOne({
      email: 'marwaboutique786@gmail.com'
    });

    if (!rizwan) {
      console.error('Rizwan Shahid not found');
      return;
    }

    console.log('Before update:');
    console.log(`Name: ${rizwan.name}`);
    console.log(`Email: ${rizwan.email}`);
    console.log(`wallet.roi: $${rizwan.wallet?.roi || 0}`);
    console.log(`profitBalance: $${rizwan.profitBalance}`);

    // Update both wallet.roi and profitBalance to $40
    const result = await usersCollection.updateOne(
      { email: 'marwaboutique786@gmail.com' },
      { 
        $set: { 
          'wallet.roi': 40.00,
          profitBalance: 40.00
        } 
      }
    );

    console.log(`\nUpdate result: ${result.modifiedCount} document(s) updated`);

    // Verify the update
    const updated = await usersCollection.findOne({
      email: 'marwaboutique786@gmail.com'
    });
    console.log('\nAfter update:');
    console.log(`wallet.roi: $${updated.wallet.roi}`);
    console.log(`profitBalance: $${updated.profitBalance}`);
    console.log('✅ Rizwan Shahid ROI updated to $40.00');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixRizwan();
