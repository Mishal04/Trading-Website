const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI);

async function search() {
  try {
    await client.connect();
    const db = client.db('trading_website');
    const usersCollection = db.collection('users');

    // Search in any field
    const results = await usersCollection.find({
      $or: [
        { name: { $regex: 'Naveed', $options: 'i' } },
        { email: { $regex: 'Naveed', $options: 'i' } },
        { email: 'mchmussa7@gmail.com' }
      ]
    }).toArray();

    if (results.length === 0) {
      console.log('No results for Naveed. Showing first 10 users with ROI...');
      const users = await usersCollection.find({ profitBalance: { $gt: 0 } })
        .limit(10)
        .toArray();
      users.forEach(u => {
        console.log(`${u.name} (${u.email}) - ROI: $${u.profitBalance}`);
      });
    } else {
      results.forEach(u => {
        console.log(`${u.name} (${u.email}) - ROI: $${u.profitBalance}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

search();
