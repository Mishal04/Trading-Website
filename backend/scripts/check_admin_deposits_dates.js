require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const InvestorInvestment = require('../src/models/InvestorInvestment');
    const User = require('../src/models/User');
    
    const adminDeposits = await InvestorInvestment.find({
      userId: { $ne: null },
      status: 'active',
      plan: 'A',
      adminNote: { $regex: /admin.*deposit|Auto-created/i }
    }).populate('userId', 'email name').sort({ createdAt: -1 });
    
    console.log('\nAdmin Deposit Investment Dates:\n');
    adminDeposits.forEach(inv => {
      const today = new Date();
      const daysOld = Math.floor((today - new Date(inv.createdAt)) / (1000 * 60 * 60 * 24));
      console.log(`${inv.userId?.email}: Created ${inv.createdAt.toISOString().split('T')[0]} (${daysOld} days ago), Amount: $${inv.amount}, ROI so far: $${inv.totalRoiEarned}`);
    });
    
    console.log(`\nToday's date: ${new Date().toISOString().split('T')[0]}`);
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
