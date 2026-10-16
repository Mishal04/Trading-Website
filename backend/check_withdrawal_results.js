#!/usr/bin/env node
/**
 * CHECK WITHDRAWAL RESULTS
 * 
 * Directly check database for Naru786 and Abdullah786 transactions
 */

const mongoose = require('mongoose');
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('═'.repeat(80));
    console.log('CHECKING WITHDRAWAL RESULTS');
    console.log('═'.repeat(80) + '\n');

    const startOfToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

    // Get test users
    const naru = await User.findOne({ name: 'Naru786' }).populate('ancestorPath', '_id name');
    const abdullah = await User.findOne({ name: 'Abdullah786' });

    if (!naru || !abdullah) {
      console.log('❌ Could not find test users');
      process.exit(1);
    }

    console.log(`Naru786 (_id: ${naru._id})`);
    console.log(`  Capital: $${naru.wallet?.capital}`);
    console.log(`  Wallet ROI: $${naru.wallet?.roi?.toFixed(2)}`);
    console.log(`  Wallet Commission: $${naru.wallet?.commission?.toFixed(2)}\n`);

    console.log(`Abdullah786 (_id: ${abdullah._id})`);
    console.log(`  Capital: $${abdullah.wallet?.capital}`);
    console.log(`  Wallet ROI: $${abdullah.wallet?.roi?.toFixed(2)}`);
    console.log(`  Wallet Commission: $${abdullah.wallet?.commission?.toFixed(2)}\n`);

    console.log('─'.repeat(80));
    console.log('Naru786 Transactions (Today):');
    console.log('─'.repeat(80));
    
    const naruTransactions = await Transaction.find({
      userId: naru._id,
      createdAt: { $gte: startOfToday }
    }).sort({ createdAt: -1 });

    if (naruTransactions.length === 0) {
      console.log('(No transactions found)');
    } else {
      naruTransactions.forEach(tx => {
        console.log(`[${tx.type.toUpperCase()}] $${tx.amount.toFixed(2)} - ${tx.description}`);
      });
    }

    console.log('\n' + '─'.repeat(80));
    console.log('Abdullah786 Transactions (Today):');
    console.log('─'.repeat(80));
    
    const abdullahTransactions = await Transaction.find({
      userId: abdullah._id,
      createdAt: { $gte: startOfToday }
    }).sort({ createdAt: -1 });

    if (abdullahTransactions.length === 0) {
      console.log('(No transactions found)');
    } else {
      abdullahTransactions.forEach(tx => {
        console.log(`[${tx.type.toUpperCase()}] $${tx.amount.toFixed(2)} - ${tx.description}`);
      });
    }

    console.log('\n' + '═'.repeat(80));
    console.log('ANALYSIS:');
    console.log('═'.repeat(80) + '\n');

    const naruROI = naruTransactions.find(tx => tx.type === 'profit');
    const naruROIAmount = naruROI?.amount || 0;
    const expectedROI = naru.wallet?.capital * 0.01;

    console.log('Naru786 ROI:');
    console.log(`  Expected (1% of $${naru.wallet?.capital}): $${expectedROI.toFixed(2)}`);
    console.log(`  Actual: $${naruROIAmount.toFixed(2)}`);
    console.log(`  Status: ${Math.abs(naruROIAmount - expectedROI) < 0.01 ? '✅ MATCH' : '❌ MISMATCH'}\n`);

    const abdullahComm = abdullahTransactions.filter(tx => tx.type === 'commission' && tx.description.includes('Naru786'));
    const abdullahCommAmount = abdullahComm.reduce((sum, tx) => sum + tx.amount, 0);
    const expectedComm = naruROIAmount * 0.25;

    console.log('Abdullah786 Commission from Naru786:');
    console.log(`  Expected (25% of $${naruROIAmount.toFixed(2)}): $${expectedComm.toFixed(2)}`);
    console.log(`  Actual: $${abdullahCommAmount.toFixed(2)}`);
    console.log(`  Status: ${Math.abs(abdullahCommAmount - expectedComm) < 0.01 ? '✅ MATCH' : '❌ MISMATCH'}\n`);

    console.log('═'.repeat(80) + '\n');

    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
