require('dotenv').config({ path: '.env' });
const { MongoClient } = require('mongodb');

const mongoUri = process.env.MONGODB_URI;

(async () => {
  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const db = client.db();
    
    console.log('\n=== Checking Orhan Account ===');
    const user = await db.collection('users').findOne({ email: 'orhanahmed11@gmail.com' });
    
    if (user) {
      console.log('Email:', user.email);
      console.log('Name:', user.name);
      console.log('isActive:', user.isActive);
      console.log('_id:', user._id);
      
      if (user.isActive === false) {
        console.log('\n✅ Account is correctly marked as INACTIVE');
      } else if (user.isActive === true) {
        console.log('\n❌ Account is marked as ACTIVE - should be INACTIVE');
        console.log('Setting isActive to false...');
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: { isActive: false } }
        );
        console.log('✅ Fixed!');
      } else {
        console.log('\n⚠️  isActive is:', user.isActive, '(type:', typeof user.isActive, ')');
      }
    } else {
      console.log('❌ User not found');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
})();
