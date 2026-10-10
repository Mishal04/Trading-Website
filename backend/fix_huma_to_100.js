const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI);

async function fixHuma() {
  try {
    await client.connect();
    const db = client.db('test');
    const usersCollection = db.collection('users');

    // Find Huma Nurjis
    const user = await usersCollection.findOne({
      email: 'humanarjis171@gmail.com'
    });

    if (!user) {
      console.error('Huma Nurjis not found');
      return;
    }

    console.log('Before update:');
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`wallet.roi: $${user.wallet?.roi || 0}`);
    console.log(`wallet.profit: $${user.wallet?.profit || 0}`);
    console.log(`profitBalance: $${user.profitBalance}`);

    // Update wallet.roi to $100 and clear wallet.profit
    const result = await usersCollection.updateOne(
      { email: 'humanarjis171@gmail.com' },
      { 
        $set: { 
          'wallet.roi': 100.00,
          'wallet.profit': 0.00,
          profitBalance: 100.00
        } 
      }
    );

    console.log(`\nUpdate result: ${result.modifiedCount} document(s) updated`);

    // Verify the update
    const updated = await usersCollection.findOne({
      email: 'humanarjis171@gmail.com'
    });
    console.log('\nAfter update:');
    console.log(`wallet.roi: $${updated.wallet.roi}`);
    console.log(`wallet.profit: $${updated.wallet.profit}`);
    console.log(`profitBalance: $${updated.profitBalance}`);
    console.log('✅ Huma Nurjis ROI updated to $100.00');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixHuma();
