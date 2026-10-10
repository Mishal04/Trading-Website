const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI);

async function find() {
  try {
    await client.connect();
    const db = client.db('test');
    const usersCollection = db.collection('users');

    // Search for Naveed
    const results = await usersCollection.find({
      $or: [
        { name: { $regex: 'Naveed', $options: 'i' } },
        { name: { $regex: 'Anjum', $options: 'i' } }
      ]
    }).toArray();

    if (results.length === 0) {
      console.log('Naveed not found. Searching by email mchmussa7@gmail.com...');
      const byEmail = await usersCollection.findOne({ email: 'mchmussa7@gmail.com' });
      if (byEmail) {
        console.log(`Found by email: ${byEmail.name} (${byEmail.email})`);
        console.log(`Current ROI: $${byEmail.profitBalance}`);
      } else {
        console.log('Email not found either. Showing users with ROI >= $30...');
        const highRoi = await usersCollection.find({ profitBalance: { $gte: 30 } })
          .limit(15)
          .toArray();
        highRoi.forEach(u => {
          console.log(`${u.name} (${u.email}) - ROI: $${u.profitBalance}`);
        });
      }
    } else {
      results.forEach(u => {
        console.log(`Found: ${u.name} (${u.email})`);
        console.log(`Current ROI: $${u.profitBalance}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

find();
