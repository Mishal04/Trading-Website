const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI);

async function findNaveed() {
  try {
    await client.connect();
    const db = client.db('trading_website');
    const usersCollection = db.collection('users');

    // Search for Naveed
    const naveed = await usersCollection.findOne({
      name: { $regex: 'Naveed', $options: 'i' }
    });

    if (!naveed) {
      console.log('Naveed not found by name. Searching for Anjum...');
      const result = await usersCollection.findOne({
        name: { $regex: 'Anjum', $options: 'i' }
      });
      if (result) {
        console.log(`Found: ${result.name} (${result.email})`);
        console.log(`Current ROI: ${result.profitBalance}`);
        console.log(`Investment approval date: ${result.investmentApprovedAt}`);
      } else {
        console.log('Not found');
      }
    } else {
      console.log(`Found: ${naveed.name} (${naveed.email})`);
      console.log(`Current ROI: ${naveed.profitBalance}`);
      console.log(`Investment approval date: ${naveed.investmentApprovedAt}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

findNaveed();
