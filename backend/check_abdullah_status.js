#!/usr/bin/env node

const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const user = await User.findOne({ name: 'Abdullah786' });
    
    console.log('Abdullah786 Status:');
    console.log(`  _id: ${user._id}`);
    console.log(`  name: ${user.name}`);
    console.log(`  isActive: ${user.isActive}`);
    console.log(`  totalInvested: ${user.totalInvested}`);
    console.log(`  wallet.capital: ${user.wallet?.capital}`);
    console.log(`  wallet.roi: ${user.wallet?.roi}`);
    console.log(`  wallet.commission: ${user.wallet?.commission}`);
    console.log(`  directCount: ${user.directCount}`);
    console.log(`  ancestorPath: ${user.ancestorPath?.length || 0} ancestors`);

    mongoose.connection.close();
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
