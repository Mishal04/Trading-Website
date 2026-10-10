const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI);

async function grantNetworkerAccess() {
  try {
    await client.connect();
    const db = client.db('test');
    const usersCollection = db.collection('users');

    // Find all users with admin deposits (investmentLevel = 'admin')
    const adminDepositUsers = await usersCollection.find({
      investmentLevel: 'admin'
    }).toArray();

    console.log(`Found ${adminDepositUsers.length} users with admin deposits\n`);

    let grantedCount = 0;
    let alreadyGrantedCount = 0;

    for (const user of adminDepositUsers) {
      if (user.networkerAccessGranted) {
        console.log(`✓ ${user.name} (${user.email}) - Already has Networker access`);
        alreadyGrantedCount++;
      } else {
        // Grant networker access
        const result = await usersCollection.updateOne(
          { _id: user._id },
          { 
            $set: { 
              networkerAccessGranted: true,
              networkerAccessGrantedAt: new Date(),
              networkerAccessGrantedBy: 'admin_system'
            } 
          }
        );

        if (result.modifiedCount > 0) {
          console.log(`✅ ${user.name} (${user.email}) - Networker access GRANTED`);
          grantedCount++;
        }
      }
    }

    console.log(`\n====================================`);
    console.log(`Total users with admin deposits: ${adminDepositUsers.length}`);
    console.log(`Newly granted: ${grantedCount}`);
    console.log(`Already had access: ${alreadyGrantedCount}`);
    console.log(`====================================`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

grantNetworkerAccess();
