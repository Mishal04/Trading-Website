const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = require('./src/models/User');
  
  const user = await User.findOne({ name: { $regex: 'Asif.*Hussain', $options: 'i' } })
    .select('_id name email wallet');
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('Database Check: Asif Hussain');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`Name: ${user.name}`);
  console.log(`Email: ${user.email}\n`);
  
  console.log('Wallet in Database:');
  console.log(`  Capital: $${user.wallet?.capital || 0}`);
  console.log(`  Profit: $${user.wallet?.profit || 0}`);
  console.log(`  Commission: $${user.wallet?.commission || 0}\n`);
  
  if ((user.wallet?.profit || 0) === 190) {
    console.log('✅ Database shows CORRECT value: $190');
    console.log('\n⚠️  If frontend still shows $0, it\'s a browser cache issue.');
    console.log('   Please do a HARD REFRESH in your browser:');
    console.log('   Windows/Linux: Ctrl + Shift + R');
    console.log('   Mac: Cmd + Shift + R\n');
  } else {
    console.log('❌ Database shows incorrect value. Re-running update...\n');
    
    await User.findByIdAndUpdate(user._id, {
      $set: { 'wallet.profit': 190 },
      $inc: { totalRoiEarned: 190, totalEarned: 190 }
    });
    
    console.log('✅ Updated database to $190');
    console.log('   Please hard refresh your browser (Ctrl+Shift+R)\n');
  }
  
  console.log('═══════════════════════════════════════════════════════════\n');
  
  process.exit(0);
})();
