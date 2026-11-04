/**
 * check_commission_source.js
 * 
 * Check if commissions are coming from InvestorInvestment or wallet.capital
 */

const mongoose = require('mongoose');
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');
const InvestorInvestment = require('./src/models/InvestorInvestment');
require('dotenv').config();

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Find Muhammadhussain
    const mh = await User.findOne({ name: /muhammadhussain/i });
    
    console.log(`\n=== COMMISSION SOURCE CHECK ===\n`);
    console.log(`Checking: ${mh.name}\n`);

    // Get all commission transactions for today
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const commTransactions = await Transaction.find({
      type: 'commission',
      createdAt: { $gte: startOfToday },
      description: /from .* daily ROI/
    }).lean();

    console.log(`Total commission transactions: ${commTransactions.length}\n`);

    // Extract member names and ROI amounts from descriptions
    const memberData = {};
    commTransactions.forEach(tx => {
      const match = tx.description.match(/from ([^']+)'s \$([0-9.]+) daily ROI/);
      if (match) {
        const name = match[1];
        const roi = parseFloat(match[2]);
        if (!memberData[name]) {
          memberData[name] = { roi, transactions: [] };
        }
        memberData[name].transactions.push(tx);
      }
    });

    console.log('Members with commissions:\n');

    for (const [name, data] of Object.entries(memberData).sort()) {
      console.log(`${name}:`);
      console.log(`  Reported ROI in description: $${data.roi.toFixed(4)}`);

      // Find this member in downline
      const member = await User.findOne({ name }).select('wallet');
      const walletCap = member?.wallet?.capital || 0;
      console.log(`  wallet.capital: $${walletCap}`);

      // Check InvestorInvestment
      const invInv = await InvestorInvestment.find({ 
        userId: member?._id, 
        status: 'active' 
      });
      const invInvTotal = invInv.reduce((s, i) => s + i.amount, 0);
      console.log(`  InvestorInvestment total: $${invInvTotal}`);

      // Determine source
      let source = '?';
      if (invInvTotal > 0) {
        const roi1 = invInvTotal * 0.01;  // 1% rate
        const roi125 = invInvTotal * 0.0125;  // 1.25% rate
        if (Math.abs(roi1 - data.roi) < 0.01 || Math.abs(roi125 - data.roi) < 0.01) {
          source = 'InvestorInvestment ✓';
        }
      }
      if (walletCap > 0) {
        const roi1 = walletCap * 0.01;
        const roi125 = walletCap * 0.0125;
        if (Math.abs(roi1 - data.roi) < 0.01 || Math.abs(roi125 - data.roi) < 0.01) {
          source = 'wallet.capital ✓';
        }
      }

      console.log(`  Source: ${source}`);
      console.log();
    }

    mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
    mongoose.connection.close();
    process.exit(1);
  }
}

check();
