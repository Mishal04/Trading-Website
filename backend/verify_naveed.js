const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI);

async function verify() {
  try {
    await client.connect();
    const db = client.db('test');
    const usersCollection = db.collection('users');

    // Check Naveed Anjum
    const naveed = await usersCollection.findOne({
      email: 'hugeindustriesskt@gmail.com'
    });

    console.log('Naveed Anjum in database:');
    console.log(`Name: ${naveed.name}`);
    console.log(`Email: ${naveed.email}`);
    console.log(`profitBalance: ${naveed.profitBalance}`);
    console.log(`_id: ${naveed._id}`);
    console.log(`Full user object keys:`, Object.keys(naveed));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

verify();
