const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI);

async function check() {
  try {
    await client.connect();
    const db = client.db('trading_website');
    const usersCollection = db.collection('users');

    const count = await usersCollection.countDocuments();
    console.log(`Total users in database: ${count}`);

    // Show first 20 users
    const users = await usersCollection.find({})
      .limit(20)
      .toArray();

    console.log('\nFirst 20 users:');
    users.forEach((u, idx) => {
      console.log(`${idx + 1}. ${u.name} (${u.email}) - ROI: $${u.profitBalance}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

check();
