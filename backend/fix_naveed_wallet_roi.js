const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI);

async function fixWallet() {
  try {
    await client.connect();
    const db = client.db('test');
    const usersCollection = db.collection('users');

    // Find Naveed Anjum
    const naveed = await usersCollection.findOne({
      email: 'hugeindustriesskt@gmail.com'
    });

    if (!naveed) {
      console.error('Naveed Anjum not found');
      return;
    }

    console.log('Before update:');
    console.log(`wallet.roi: $${naveed.wallet.roi}`);
    console.log(`profitBalance: $${naveed.profitBalance}`);

    // Update both wallet.roi and profitBalance to $40
    const result = await usersCollection.updateOne(
      { email: 'hugeindustriesskt@gmail.com' },
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
      email: 'hugeindustriesskt@gmail.com'
    });
    console.log('\nAfter update:');
    console.log(`wallet.roi: $${updated.wallet.roi}`);
    console.log(`profitBalance: $${updated.profitBalance}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixWallet();
