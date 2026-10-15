const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trading');
    
    const zubairiId = '6aa710bb6efbe2df22e4b15d';
    const user = await User.findById(zubairiId).populate('ancestorPath');
    
    console.log('═'.repeat(70));
    console.log('DEBUG: Muhammad Zubair Setup');
    console.log('═'.repeat(70));
    
    console.log('\n1. USER DATA:');
    console.log('  Name:', user?.name);
    console.log('  ID:', user?._id);
    console.log('  Is Active:', user?.isActive);
    console.log('  Total Invested:', user?.totalInvested);
    console.log('  Has Upline:', !!user?.ancestorPath?.length);
    console.log('  Upline Name:', user?.ancestorPath?.[0]?.name);
    console.log('  Direct Count:', user?.directCount);
    
    console.log('\n2. ACTIVE INVESTMENTS:');
    const activeInvs = await InvestorInvestment.find({ 
      userId: zubairiId, 
      status: 'active'
    });
    
    console.log('  Count:', activeInvs.length);
    let totalDaily = 0;
    activeInvs.forEach((inv, i) => {
      const daily = inv.amount * inv.dailyRate;
      totalDaily += daily;
      console.log(`    ${i+1}. $${inv.amount} @ ${(inv.dailyRate*100).toFixed(4)}% = $${daily.toFixed(2)}/day`);
    });
    
    console.log('  Total Daily ROI:', totalDaily.toFixed(2));
    
    if (activeInvs.length === 0) {
      console.log('\n❌ NO ACTIVE INVESTMENTS - This is why he got $0 today!');
    }
    
    // Check if he has ANY investments
    const allInvs = await InvestorInvestment.find({ userId: zubairiId });
    console.log('\n3. ALL INVESTMENTS:');
    console.log('  Total Count:', allInvs.length);
    allInvs.forEach((inv, i) => {
      console.log(`    ${i+1}. $${inv.amount}, Status: ${inv.status}`);
    });
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
