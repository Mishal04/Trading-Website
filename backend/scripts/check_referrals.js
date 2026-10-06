require('dotenv').config({ path: '.env' });
const { MongoClient } = require('mongodb');

const mongoUri = process.env.MONGODB_URI;

(async () => {
  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const db = client.db();
    
    console.log('\n=== Checking User Referrals ===\n');
    
    // Find TeamTree entries with referrals
    const teamTrees = await db.collection('teamtrees')
      .find({ $or: [{ directCount: { $gt: 0 } }, { totalTeamCount: { $gt: 0 } }] })
      .limit(10)
      .toArray();
    
    console.log(`Found ${teamTrees.length} users with referrals\n`);
    
    for (const tree of teamTrees) {
      const user = await db.collection('users').findOne({ _id: tree.userId });
      
      if (user) {
        console.log(`User: ${user.name} (${user.email})`);
        console.log(`  Direct referrals: ${tree.directCount}`);
        console.log(`  Total team size: ${tree.totalTeamCount}`);
        console.log(`  Parent ID: ${tree.parentId}`);
        
        // Get parent user
        if (tree.parentId) {
          const parent = await db.collection('users').findOne({ _id: tree.parentId });
          if (parent) {
            console.log(`  Parent: ${parent.name} (${parent.email})`);
          }
        }
        console.log('');
      }
    }
    
    if (teamTrees.length === 0) {
      console.log('No users with referrals found in TeamTree collection');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
})();
