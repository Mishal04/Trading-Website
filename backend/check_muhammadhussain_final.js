const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');
const Transaction = require('./src/models/Transaction');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trading');
    
    const hussainId = '6aaaa414690cd9c2b645d273';
    const user = await User.findById(hussainId).populate('ancestorPath');
    
    console.log('═'.repeat(70));
    console.log('FINAL CHECK: Muhammadhussain (ID: 6aaaa414690cd9c2b645d273)');
    console.log('═'.repeat(70));
    
    console.log('\nUSER INFO:');
    console.log('  Name:', user?.name);
    console.log('  Direct Count:', user?.directCount);
    console.log('  Upline:', user?.ancestorPath?.[0]?.name);
    console.log('  Wallet Commission:', user?.wallet?.commission || 0);
    console.log('  Total Earned:', user?.totalEarned || 0);
    
    // Check active investments
    const activeInvs = await InvestorInvestment.find({ 
      userId: hussainId,
      status: 'active'
    });
    
    console.log('\nINVESTMENTS:');
    console.log('  Active Count:', activeInvs.length);
    let dailyROI = 0;
    activeInvs.forEach(inv => {
      const daily = inv.amount * inv.dailyRate;
      dailyROI += daily;
      console.log(`    $${inv.amount} @ ${(inv.dailyRate*100).toFixed(2)}% = $${daily.toFixed(2)}/day`);
    });
    console.log('  Total Daily ROI:', dailyROI.toFixed(2));
    
    // Check TODAY's profit-based commissions
    const today = new Date('2026-10-15');
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const commissions = await Transaction.find({
      userId: hussainId,
      date: { $gte: today, $lt: tomorrow },
      type: 'commission',
      description: { $regex: 'profit' }
    }).sort({ date: -1 });
    
    console.log('\nTODAY\'S PROFIT-BASED COMMISSIONS:');
    console.log('  Count:', commissions.length);
    let total = 0;
    commissions.forEach((tx, i) => {
      console.log(`    ${i+1}. $${tx.amount} - ${tx.description}`);
      total += tx.amount;
    });
    console.log(`  TOTAL: $${total.toFixed(2)}`);
    
    if (total === 0) {
      console.log('\n❌ NO PROFIT-BASED COMMISSIONS RECEIVED TODAY');
      console.log('   (The cron run may not have processed him yet)');
    } else if (Math.abs(total - 21.61) < 0.01) {
      console.log('\n✅ CORRECT: $21.61 RECEIVED!');
    } else {
      console.log('\n⚠️ WRONG AMOUNT: Expected $21.61, got $' + total.toFixed(2));
    }
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
