const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.MONGODB_URI);

async function check() {
  try {
    await client.connect();
    const db = client.db('test');
    const usersCollection = db.collection('users');

    // Find Najum Malik
    const user = await usersCollection.findOne({
      email: 'najummalik97@gmail.com'
    });

    if (!user) {
      console.error('Najum Malik not found');
      return;
    }

    console.log('Najum Malik full details:');
    console.log(`wallet.roi: $${user.wallet?.roi || 0}`);
    console.log(`wallet.profit: $${user.wallet?.profit || 0}`);
    console.log(`profitBalance: $${user.profitBalance}`);
    console.log(`totalEarned: $${user.totalEarned}`);
    console.log(`totalRoiEarned: $${user.totalRoiEarned}`);
    console.log(`totalProfitEarned: $${user.totalProfitEarned}`);
    
    // Dashboard calculation
    const totalProfitEarned = (user.totalProfitEarned || 0) + (user.totalRoiEarned || 0);
    console.log(`\nDashboard calculation (totalProfitEarned + totalRoiEarned): $${totalProfitEarned}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

check();
