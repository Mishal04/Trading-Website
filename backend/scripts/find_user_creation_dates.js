require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    const InvestorInvestment = require('../src/models/InvestorInvestment');
    
    // Get the backfilled users
    const adminDeposits = await InvestorInvestment.find({
      userId: { $ne: null },
      status: 'active',
      plan: 'A',
      adminNote: { $regex: /admin.*deposit|Auto-created/i }
    }).populate('userId');
    
    console.log('\nUser account creation dates:\n');
    
    const users = [];
    
    for (const inv of adminDeposits) {
      const user = inv.userId;
      if (!user) continue;
      
      const createdDate = user.createdAt.toISOString().split('T')[0];
      
      users.push({
        email: user.email,
        name: user.name,
        accountCreated: createdDate,
        depositAmount: inv.amount,
        roiEarned: inv.totalRoiEarned
      });
    }
    
    users.sort((a, b) => new Date(a.accountCreated) - new Date(b.accountCreated));
    
    console.table(users);
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
