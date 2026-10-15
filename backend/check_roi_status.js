const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trading');
    
    console.log('\n🔍 CHECKING WHY OTHERS DIDNT GET ROI:\n');
    
    const users = ['IRFAN Ramay', 'Muhammad Shahansha'];
    
    for (const name of users) {
      const user = await User.findOne({ name });
      if (!user) continue;
      
      const inv = await InvestorInvestment.findOne({ userId: user._id, status: 'active' });
      if (!inv) continue;
      
      const today = new Date('2026-10-15');
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      console.log(`${name}:`);
      console.log(`  Last ROI: ${inv.lastRoiDate.toISOString()}`);
      console.log(`  Today Start: ${startOfToday.toISOString()}`);
      console.log(`  Already processed today? ${inv.lastRoiDate >= startOfToday ? 'YES' : 'NO'}`);
      console.log(`  Cap Reached? ${inv.capReached}`);
      console.log();
    }
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
