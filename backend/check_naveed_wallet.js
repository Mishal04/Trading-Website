const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI);

async function check() {
  try {
    await client.connect();
    const db = client.db('test');
    const usersCollection = db.collection('users');

    // Check Naveed Anjum
    const naveed = await usersCollection.findOne({
      email: 'hugeindustriesskt@gmail.com'
    });

    console.log('Naveed Anjum wallet details:');
    console.log('profitBalance:', naveed.profitBalance);
    console.log('wallet:', naveed.wallet);
    console.log('totalEarned:', naveed.totalEarned);
    console.log('totalRoiEarned:', naveed.totalRoiEarned);
    console.log('totalProfitEarned:', naveed.totalProfitEarned);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

check();
