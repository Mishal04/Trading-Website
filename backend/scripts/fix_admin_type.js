require('dotenv').config({ path: '.env' });
const { MongoClient } = require('mongodb');

const mongoUri = process.env.MONGODB_URI;

(async () => {
  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const db = client.db();
    
    console.log('\n=== Fixing Admin Account Types ===');
    
    // Find all admin accounts that might be missing accountType or have wrong value
    const adminEmails = ['info.solvex1@gmail.com', 'test-admin@test.com'];
    
    for (const email of adminEmails) {
      const user = await db.collection('users').findOne({ email });
      
      if (user) {
        console.log(`\n[${email}]`);
        console.log(`  accountType: ${user.accountType}`);
        
        if (user.accountType !== 'admin') {
          console.log(`  ⚠️  Fixing to "admin"...`);
          await db.collection('users').updateOne(
            { email },
            { $set: { accountType: 'admin' } }
          );
          console.log(`  ✅ Fixed!`);
        } else {
          console.log(`  ✅ Already correct`);
        }
      } else {
        console.log(`\n❌ [${email}] not found`);
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
})();
