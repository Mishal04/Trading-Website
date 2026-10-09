require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    const InvestorInvestment = require('../src/models/InvestorInvestment');
    
    // Get all admin deposits
    const adminDeposits = await InvestorInvestment.find({
      userId: { $ne: null },
      status: 'active',
      plan: 'A',
      adminNote: { $regex: /admin.*deposit|Auto-created/i }
    }).populate('userId', 'name email');
    
    console.log('\nChecking each user\'s actual deposit date:\n');
    
    const users = [];
    
    for (const inv of adminDeposits) {
      const user = inv.userId;
      if (!user) continue;
      
      // Check user's wallet history - when did capital wallet get the deposit?
      // We need to look at the user document's lastLogin, createdAt, etc
      // But better: check wallet transaction history
      
      users.push({
        email: user.email,
        name: user.name,
        amount: inv.amount,
        investmentCreated: inv.createdAt.toISOString().split('T')[0],
        totalRoiEarned: inv.totalRoiEarned,
        alreadyGot: inv.totalRoiEarned === 1 || inv.totalRoiEarned === inv.amount * 0.01
      });
    }
    
    // Sort by amount to group similar ones
    users.sort((a, b) => b.amount - a.amount);
    
    console.log('Investment Analysis:');
    console.table(users);
    
    console.log('\nKnown deposit dates (from UI):');
    console.log('- Anees: Oct 8 (should have only Oct 9 ROI = $1, currently has $4)');
    console.log('- Naveed: Oct 5 (should have Oct 6,7,8,9 = $40, currently has $40 ✓)');
    console.log('- Others: Assumed Oct 5 (but need to verify)');
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
