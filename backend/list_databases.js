const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI);

async function listDatabases() {
  try {
    await client.connect();
    const adminDb = client.db('admin');
    const { databases } = await adminDb.admin().listDatabases();

    console.log('Available databases:');
    databases.forEach(db => {
      console.log(`- ${db.name}`);
    });

    // Try to find the right database
    console.log('\n\nChecking each database for users collection...');
    for (const db of databases) {
      const database = client.db(db.name);
      const collections = await database.listCollections().toArray();
      const hasUsers = collections.some(c => c.name === 'users');
      if (hasUsers) {
        console.log(`\n✓ Found users collection in database: ${db.name}`);
        const usersCollection = database.collection('users');
        const count = await usersCollection.countDocuments();
        console.log(`  Total users: ${count}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

listDatabases();
