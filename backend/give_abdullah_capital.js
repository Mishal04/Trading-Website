#!/usr/bin/env node

const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Give Abdullah786 $100 capital so he's eligible for commissions
    const result = await User.findOneAndUpdate(
      { name: 'Abdullah786' },
      { 'wallet.capital': 100 },
      { new: true }
    );
    
    console.log('Updated Abdullah786:');
    console.log(`  wallet.capital: ${result.wallet?.capital}`);
    console.log(`  totalInvested: ${result.totalInvested}`);
    
    console.log('\nNow Abdullah786 is eligible for commissions (has capital > 0)\n');

    mongoose.connection.close();
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
