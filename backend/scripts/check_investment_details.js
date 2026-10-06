require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    const InvestorInvestment = require('../src/models/InvestorInvestment');
    
    const user = await User.findOne({ email: 'orhanahmed11@gmail.com' });
    const investment = await InvestorInvestment.findOne({ userId: user._id, status: 'active' });
    
    console.log('Investment Details:');
    console.log('Amount:', investment.amount);
    console.log('dailyRate (raw):', investment.dailyRate);
    console.log('dailyRate (as %):', investment.dailyRate * 100);
    console.log('');
    console.log('Calculation:');
    console.log('2000 * dailyRate =', 2000 * investment.dailyRate);
    console.log('2000 * dailyRate / 100 =', (2000 * investment.dailyRate) / 100);
    console.log('');
    console.log('Full doc:');
    console.log(JSON.stringify(investment, null, 2));
    
    mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
})();
