require('dotenv').config({ path: '.env' });
const { MongoClient } = require('mongodb');

const mongoUri = process.env.MONGODB_URI;

(async () => {
  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const db = client.db();
    
    console.log('\n=== Checking All Admin Accounts ===');
    const admins = await db.collection('users').find({ accountType: 'admin' }).toArray();
    
    if (admins.length === 0) {
      console.log('❌ No admin accounts found!');
    } else {
      admins.forEach((admin, idx) => {
        console.log(`\n[${idx + 1}] ${admin.name} (${admin.email})`);
        console.log('  isActive:', admin.isActive);
        console.log('  accountType:', admin.accountType);
        console.log('  isVerified:', admin.isVerified);
        
        if (!admin.isActive) {
          console.log('  ⚠️  INACTIVE - Fixing...');
          // Note: we'll show what to do but not auto-fix
        }
      });
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
})();
