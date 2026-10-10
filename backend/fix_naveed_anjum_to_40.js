const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI);

async function fixNaveedAnjum() {
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

    console.log(`Found Naveed: ${naveed.name} (${naveed.email})`);
    console.log(`Current ROI balance: ${naveed.profitBalance}`);
    console.log(`Investment approval date: ${naveed.investmentApprovedAt}`);

    // Update ROI to $40.00
    const result = await usersCollection.updateOne(
      { email: 'hugeindustriesskt@gmail.com' },
      { $set: { profitBalance: 40.00 } }
    );

    console.log(`\nUpdate result: ${result.modifiedCount} document(s) updated`);
    console.log('Naveed Anjum ROI balance set to $40.00');

    // Verify the update
    const updated = await usersCollection.findOne({
      email: 'hugeindustriesskt@gmail.com'
    });
    console.log(`Verified new ROI balance: $${updated.profitBalance}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixNaveedAnjum();
