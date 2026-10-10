const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI);

async function checkUsers() {
  try {
    await client.connect();
    const db = client.db('test');
    const usersCollection = db.collection('users');
    const investmentsCollection = db.collection('investorinvestments');

    const emails = [
      'adilmehmoodarain63@gmail.com',
      'abdulsamadarain371@gmail.com',
      'aghesni369@gmail.com',
      'talharamzannew@gmail.com'
    ];

    for (const email of emails) {
      const user = await usersCollection.findOne({ email });
      
      if (!user) {
        console.log(`❌ ${email} - NOT FOUND\n`);
        continue;
      }

      console.log(`\n📋 ${user.name} (${email})`);
      console.log(`   totalInvested: $${user.totalInvested || 0}`);

      // Find all investments
      const investments = await investmentsCollection.find({
        userId: user._id
      }).toArray();

      console.log(`   Total investments: ${investments.length}`);
      
      if (investments.length > 0) {
        investments.forEach((inv, idx) => {
          console.log(`   [${idx + 1}] Amount: $${inv.amount} | Status: ${inv.status} | Plan: ${inv.plan}`);
        });
        
        // Sum active investments
        const activeTotal = investments
          .filter(inv => inv.status === 'active')
          .reduce((sum, inv) => sum + (inv.amount || 0), 0);
        
        console.log(`   Active investments total: $${activeTotal}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkUsers();
