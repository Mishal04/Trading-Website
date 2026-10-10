const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI);

async function checkAmanAli() {
  try {
    await client.connect();
    const db = client.db('test');
    const usersCollection = db.collection('users');
    const investmentsCollection = db.collection('investments');

    // Find Aman Ali
    const user = await usersCollection.findOne({
      email: 'alivideostv.com@gmail.com'
    });

    if (!user) {
      console.error('Aman Ali not found');
      return;
    }

    console.log('Aman Ali Details:');
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`investmentApprovedAt: ${user.investmentApprovedAt}`);
    console.log(`joinDate: ${user.joinDate}`);
    console.log(`createdAt: ${user.createdAt}`);

    // Get all investments for this user
    const investments = await investmentsCollection.find({
      userId: user._id
    }).toArray();

    console.log(`\nTotal investments: ${investments.length}`);
    investments.forEach((inv, idx) => {
      console.log(`\nInvestment ${idx + 1}:`);
      console.log(`  Amount: $${inv.amount}`);
      console.log(`  Status: ${inv.status}`);
      console.log(`  Approved At: ${inv.approvedAt}`);
      console.log(`  Created At: ${inv.createdAt}`);
      console.log(`  Updated At: ${inv.updatedAt}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkAmanAli();
