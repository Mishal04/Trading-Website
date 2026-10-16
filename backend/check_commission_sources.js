#!/usr/bin/env node
/**
 * CHECK: Who is the referrer getting commissions from?
 */

const mongoose = require('mongoose');
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Find the referrer (Mominali based on 5 directs)
    const mominali = await User.findOne({ name: 'Mominali' }).select('_id name');
    
    if (!mominali) {
      console.log('Mominali not found');
      process.exit(1);
    }

    const startOfToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

    console.log('═'.repeat(80));
    console.log('COMMISSION SOURCES FOR MOMINALI');
    console.log('═'.repeat(80) + '\n');

    // Get all commission transactions for Mominali today
    const commissions = await Transaction.find({
      userId: mominali._id,
      type: 'commission',
      createdAt: { $gte: startOfToday }
    }).select('description amount -_id');

    console.log(`Commissions received today: ${commissions.length}\n`);

    // Extract source names
    const sources = new Set();
    commissions.forEach(tx => {
      const match = tx.description.match(/from\s+([^']+)'s/);
      if (match) {
        sources.add(match[1]);
      }
    });

    console.log('Commission sources (who is Mominali getting commissions FROM):');
    sources.forEach(name => {
      console.log(`  ✅ ${name}`);
    });

    console.log('\nDownline members (who should show $0 if NO commission):');
    
    const downline = await User.find({ ancestorPath: mominali._id })
      .select('name email totalInvested wallet')
      .sort({ createdAt: -1 });

    downline.forEach(member => {
      const hasCommission = sources.has(member.name);
      const capital = member.wallet?.capital || 0;
      const invested = (member.totalInvested || 0);
      
      const displayAmount = invested > 0 ? invested : capital;
      
      console.log(`  ${member.name}: $${displayAmount} - ${hasCommission ? '✅ EARNING' : '❌ NOT EARNING'}`);
    });

    mongoose.connection.close();
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
