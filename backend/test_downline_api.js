#!/usr/bin/env node
/**
 * TEST: What does /api/team/downline actually return?
 */

const mongoose = require('mongoose');
const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');
const constants = require('./config/constants');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Simulate the API call for a user (let's use Mominali who has the 5 directs)
    const mominali = await User.findOne({ name: 'Mominali' }).select('_id name');
    
    if (!mominali) {
      console.log('Mominali not found');
      process.exit(1);
    }

    const userId = mominali._id;

    // Run the same query as the API
    const byAncestorPath = await User.find({ ancestorPath: userId })
      .select('name email referralCode totalInvested investmentLevel isVerified isActive createdAt ancestorPath referredBy directCount wallet')
      .sort({ createdAt: -1 })
      .lean();

    console.log('API Response for Mominali\'s downline:\n');
    console.log(`Total members: ${byAncestorPath.length}\n`);

    // Process each member as the API does
    for (const user of byAncestorPath) {
      // Calculate active investments
      const activeInvs = await InvestorInvestment.aggregate([
        { $match: { userId: user._id, status: 'active', approvedBy: { $ne: null } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      const activeInvested = activeInvs.length > 0 ? activeInvs[0].total : 0;
      
      // Fallback
      const investmentDisplay = activeInvested > 0 ? activeInvested : (user.wallet?.capital || 0);

      console.log(`${user.name}:`);
      console.log(`  wallet.capital: $${user.wallet?.capital || 0}`);
      console.log(`  approvedInvested: $${activeInvested}`);
      console.log(`  Display in UI: $${investmentDisplay}`);
      console.log();
    }

    mongoose.connection.close();
  } catch(e) {
    console.error('Error:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();
