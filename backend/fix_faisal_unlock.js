const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/test', { 
      serverSelectionTimeoutMS: 5000 
    });
    
    const faisal = await User.findOne({ name: 'Faisal' });
    
    if (!faisal) {
      console.log('Faisal not found');
      process.exit(0);
    }
    
    console.log('Before fix:');
    console.log('  directCount:', faisal.directCount);
    console.log('  unlockedLevels:', faisal.unlockedLevels);
    console.log('  totalInvested:', faisal.totalInvested);
    
    // Calculate correct unlockedLevels
    const correctUnlockedLevels = (faisal.directCount || 0) * 2;
    
    console.log('\nCalculated unlockedLevels: ' + correctUnlockedLevels);
    
    if (correctUnlockedLevels !== faisal.unlockedLevels) {
      await User.findByIdAndUpdate(faisal._id, {
        unlockedLevels: correctUnlockedLevels
      });
      console.log('✓ Updated unlockedLevels to', correctUnlockedLevels);
    }
    
    const updated = await User.findById(faisal._id);
    console.log('\nAfter fix:');
    console.log('  directCount:', updated.directCount);
    console.log('  unlockedLevels:', updated.unlockedLevels);
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
})();
