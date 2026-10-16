const mongoose = require('mongoose');
const User = require('./src/models/User');

require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Find M Khalid
    const user = await User.findOne({ name: 'M Khalid' });
    console.log('Before update:');
    console.log('  wallet.capital: $' + (user.wallet?.capital || 0));
    
    // Try the EXACT update from the approval code
    const result = await User.findByIdAndUpdate(user._id, {
      $inc: { 
        'wallet.capital': 5000,
        totalInvested: 5000
      }
    }, { new: true });
    
    console.log('\nAfter update (test):');
    console.log('  wallet.capital: $' + (result.wallet?.capital || 0));
    console.log('  totalInvested: $' + (result.totalInvested || 0));
    
    console.log('\nConclusion:');
    if (result.wallet.capital === 5000) {
      console.log('✓ The update query WORKS correctly');
      console.log('✗ So the bug must be that the approval code was never called');
    } else {
      console.log('✗ The update query FAILED - nested $inc not working');
      console.log('✓ Need to fix the query syntax');
    }
    
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
