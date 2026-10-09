require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    const InvestorInvestment = require('../src/models/InvestorInvestment');
    
    // Look for admin deposits (they have adminNote with 'admin deposit')
    const adminDeposits = await InvestorInvestment.find({
      userId: { $ne: null },
      status: 'active',
      plan: 'A',
      adminNote: { $regex: /admin.*deposit|Auto-created/i }
    }).populate('userId', 'name email').sort({ createdAt: 1 });
    
    console.log(`\nFound ${adminDeposits.length} admin deposits\n`);
    
    // Group by creation date
    const byDate = {};
    adminDeposits.forEach(inv => {
      const date = inv.createdAt.toISOString().split('T')[0];
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push({
        email: inv.userId?.email,
        amount: inv.amount,
        roi: inv.totalRoiEarned
      });
    });
    
    console.log('Admin Deposits by Creation Date:');
    Object.keys(byDate).sort().forEach(date => {
      console.log(`\n${date} - ${byDate[date].length} deposits:`);
      byDate[date].forEach(d => {
        console.log(`  ${d.email}: $${d.amount} (ROI: $${d.roi})`);
      });
    });
    
    console.log(`\nToday's date: ${new Date().toISOString().split('T')[0]}`);
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
