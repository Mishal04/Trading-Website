const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI);

async function fixIrfan() {
  try {
    await client.connect();
    const db = client.db('test');
    const usersCollection = db.collection('users');

    // Find IRFAN Ramay
    const user = await usersCollection.findOne({
      email: 'irfanramay123@gmail.com'
    });

    if (!user) {
      console.error('IRFAN Ramay not found');
      return;
    }

    console.log('Before update:');
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`wallet.roi: $${user.wallet?.roi || 0}`);
    console.log(`wallet.profit: $${user.wallet?.profit || 0}`);
    console.log(`profitBalance: $${user.profitBalance}`);

    // Update wallet.roi to $70 and clear wallet.profit
    const result = await usersCollection.updateOne(
      { email: 'irfanramay123@gmail.com' },
      { 
        $set: { 
          'wallet.roi': 70.00,
          'wallet.profit': 0.00,
          profitBalance: 70.00
        } 
      }
    );

    console.log(`\nUpdate result: ${result.modifiedCount} document(s) updated`);

    // Verify the update
    const updated = await usersCollection.findOne({
      email: 'irfanramay123@gmail.com'
    });
    console.log('\nAfter update:');
    console.log(`wallet.roi: $${updated.wallet.roi}`);
    console.log(`wallet.profit: $${updated.wallet.profit}`);
    console.log(`profitBalance: $${updated.profitBalance}`);
    console.log('✅ IRFAN Ramay ROI updated to $70.00');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixIrfan();
