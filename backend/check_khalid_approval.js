const mongoose = require('mongoose');
const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');

require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const user = await User.findOne({ name: 'M Khalid' });
    console.log('M Khalid (before approval code):');
    console.log('  wallet.capital: $' + (user.wallet?.capital || 0));
    console.log('  totalInvested: $' + (user.totalInvested || 0));
    
    const inv = await InvestorInvestment.findOne({ amount: 5000, userId: user._id }).populate('approvedBy', 'name');
    
    if (inv) {
      console.log('\nM Khalid 5000 investment:');
      console.log('  Amount: $' + inv.amount);
      console.log('  Status: ' + inv.status);
      console.log('  ApprovedBy: ' + (inv.approvedBy ? inv.approvedBy.name : 'null'));
      console.log('  ApprovedAt: ' + (inv.approvedAt ? 'Yes' : 'No'));
      
      console.log('\nWhat SHOULD have happened:');
      console.log('  wallet.capital += 5000');
      console.log('  Result: wallet.capital = 5000');
      
      console.log('\nWhat ACTUALLY happened:');
      console.log('  wallet.capital = 0');
      
      console.log('\nPossible reasons:');
      console.log('  1. Approval endpoint was never called');
      console.log('  2. Approval endpoint failed silently');
      console.log('  3. Admin approved but wallet update bug');
    }
    
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
