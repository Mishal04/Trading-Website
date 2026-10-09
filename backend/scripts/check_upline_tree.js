const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('../src/models/User');
  const nabeel = await User.findOne({ email: 'billajutt161@gmail.com' });
  
  console.log('\n🌳 NABEEL\'S UPLINE TREE:\n');
  
  for (let i = 0; i < nabeel.ancestorPath.length; i++) {
    const upline = await User.findById(nabeel.ancestorPath[i]).select('name totalInvested directCount isActive');
    const hasInvested = (upline.totalInvested || 0) > 0;
    console.log(`L${i+1}: ${upline.name.padEnd(20)} | Invested: $${upline.totalInvested.toString().padEnd(6)} | Directs: ${upline.directCount.toString().padEnd(2)} | Active: ${upline.isActive ? '✅' : '❌'} | Can Earn: ${hasInvested ? '✅' : '❌'}`);
  }
  
  console.log('\n❌ PROBLEM: Any upline without totalInvested > 0 will NOT receive Nabeel\'s commission');
  console.log('   They need to make an investment themselves first\n');
  
  mongoose.disconnect();
}).catch(e => console.error(e.message));
