const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI);

async function grantNetworkerAccess() {
  try {
    await client.connect();
    const db = client.db('test');
    const usersCollection = db.collection('users');
    const investmentsCollection = db.collection('investorinvestments');

    // Find all investments with adminNote containing 'admin deposit' (these are deposited users)
    const adminDepositInvestments = await investmentsCollection.find({
      adminNote: { $regex: /admin.*deposit|Auto-created investment from admin/i }
    }).toArray();

    console.log(`Found ${adminDepositInvestments.length} admin deposit investments\n`);

    // Get unique user IDs
    const userIds = [...new Set(adminDepositInvestments.map(inv => inv.userId.toString()))];
    console.log(`Unique users with admin deposits: ${userIds.length}\n`);

    let grantedCount = 0;
    let alreadyGrantedCount = 0;

    for (const userId of userIds) {
      const user = await usersCollection.findOne({ _id: new (require('mongodb')).ObjectId(userId) });
      
      if (!user) {
        console.log(`⚠️  User ID ${userId} not found`);
        continue;
      }

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
              networkerAccessGrantedBy: 'admin_system_backfill'
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
    console.log(`Total admin deposit investments: ${adminDepositInvestments.length}`);
    console.log(`Unique users affected: ${userIds.length}`);
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
