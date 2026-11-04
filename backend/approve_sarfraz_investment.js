#!/usr/bin/env node
/**
 * APPROVE SARFRAZ'S INVESTOR INVESTMENT
 */

const mongoose = require('mongoose');
const InvestorInvestment = require('./src/models/InvestorInvestment');
const User = require('./src/models/User');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('Approving Sarfraz Ahmad\'s InvestorInvestment...\n');

    const sarfraz = await User.findOne({ email: 'arianbadsha939@gmail.com' });
    
    const investment = await InvestorInvestment.findOne({
      userId: sarfraz._id,
      status: 'active',
      approvedBy: null
    });

    if (!investment) {
      console.log('No pending investments found');
      process.exit(0);
    }

    console.log('Before:');
    console.log(`  Amount: $${investment.amount}`);
    console.log(`  Status: ${investment.status}`);
    console.log(`  ApprovedBy: ${investment.approvedBy}`);
    console.log(`  Plan: ${investment.plan}\n`);

    // Find an admin to approve
    const admin = await User.findOne({ role: 'admin' }).select('_id name');
    
    if (!admin) {
      console.log('No admin found to approve');
      process.exit(1);
    }

    // Approve the investment
    const updated = await InvestorInvestment.findByIdAndUpdate(
      investment._id,
      {
        approvedBy: admin._id,
        approvedDate: new Date()
      },
      { new: true }
    );

    console.log('After Approval:');
    console.log(`  Amount: $${updated.amount}`);
    console.log(`  Status: ${updated.status}`);
    console.log(`  ApprovedBy: ${updated.approvedBy} (${admin.name})`);
    console.log(`  Plan: ${updated.plan}\n`);

    console.log('✅ Investment approved!');
    console.log('   Next: Run daily profit job to generate ROI\n');

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
