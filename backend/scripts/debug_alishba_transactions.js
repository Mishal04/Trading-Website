/**
 * Debug script to find the exact transaction record breaking the frontend
 * for user alishba@gmail.com
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Transaction = require('../src/models/Transaction');

async function debug() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find alishba user
    const alishbaUser = await User.findOne({ email: 'alishba@gmail.com' });
    
    if (!alishbaUser) {
      console.log('❌ User alishba@gmail.com not found');
      console.log('Looking for any user with email containing "alishba"...');
      const anyAlishba = await User.findOne({ email: /alishba/i });
      if (anyAlishba) {
        console.log(`Found: ${anyAlishba.email}`);
      } else {
        console.log('❌ No alishba user found');
        process.exit(1);
      }
    }

    const userId = alishbaUser?._id || anyAlishba?._id;
    console.log(`📋 User: ${alishbaUser?.email || anyAlishba?.email}`);
    console.log(`📍 User ID: ${userId}\n`);

    // Get all transactions for this user
    const transactions = await Transaction.find({ userId }).sort({ createdAt: -1 });
    console.log(`═`.repeat(60));
    console.log(`TRANSACTIONS FOR THIS USER: ${transactions.length} total`);
    console.log(`═`.repeat(60) + '\n');

    if (transactions.length === 0) {
      console.log('⚠️  No transactions found for this user');
      process.exit(0);
    }

    // Show FIRST transaction in detail (this is the one causing index 0 error)
    console.log('🔴 TRANSACTION AT INDEX 0 (the one causing the crash):');
    console.log('─'.repeat(60) + '\n');

    const txn0 = transactions[0];
    console.log('Raw MongoDB Document:');
    console.log(JSON.stringify(txn0.toObject(), null, 2));
    console.log('\n');

    // Break it down field by field
    console.log('Field-by-field breakdown:');
    console.log(`  _id: ${txn0._id} (type: ${typeof txn0._id})`);
    console.log(`  userId: ${txn0.userId} (type: ${typeof txn0.userId})`);
    console.log(`  type: ${txn0.type} (type: ${typeof txn0.type})`);
    console.log(`  amount: ${txn0.amount} (type: ${typeof txn0.amount})`);
    console.log(`  status: ${txn0.status} (type: ${typeof txn0.status})`);
    console.log(`  description: ${txn0.description} (type: ${typeof txn0.description})`);
    console.log(`  createdAt: ${txn0.createdAt} (type: ${typeof txn0.createdAt})`);
    console.log(`  date: ${txn0.date} (type: ${typeof txn0.date})`);
    console.log(`  updatedAt: ${txn0.updatedAt} (type: ${typeof txn0.updatedAt})`);
    
    // Check for any additional fields
    console.log('\nAll fields on object:');
    const obj = txn0.toObject();
    Object.keys(obj).forEach(key => {
      const val = obj[key];
      console.log(`  ${key}: ${JSON.stringify(val)} (type: ${typeof val})`);
    });

    console.log('\n' + '═'.repeat(60));
    console.log('FRONTEND RENDERING CODE ANALYSIS');
    console.log('═'.repeat(60) + '\n');

    console.log('The frontend expects to render:');
    console.log(`  txnType = txn.type || 'unknown'`);
    console.log(`  txnAmount = (typeof txn.amount === 'number') ? txn.amount : 0`);
    console.log(`  txnStatus = txn.status || 'pending'`);
    console.log(`  txnDescription = txn.description || 'Transaction'`);
    console.log(`  txnDate = txn.createdAt || txn.date || new Date().toISOString()`);
    console.log(`  txnId = txn._id || \`txn-\${idx}\`\n`);

    // Simulate frontend rendering
    console.log('Simulating frontend rendering attempt:');
    try {
      const txnType = txn0.type || 'unknown';
      console.log(`  ✓ txnType = "${txnType}"`);
      
      const txnAmount = typeof txn0.amount === 'number' ? txn0.amount : 0;
      console.log(`  ✓ txnAmount = ${txnAmount}`);
      
      const txnStatus = txn0.status || 'pending';
      console.log(`  ✓ txnStatus = "${txnStatus}"`);
      
      const txnDescription = txn0.description || 'Transaction';
      console.log(`  ✓ txnDescription = "${txnDescription}"`);
      
      const txnDate = txn0.createdAt || txn0.date || new Date().toISOString();
      console.log(`  ✓ txnDate = "${txnDate}"`);
      
      const txnId = txn0._id || `txn-0`;
      console.log(`  ✓ txnId = "${txnId}"\n`);

      // Now try the actual formatting functions
      const fmt = (n = 0) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);

      const fmtDate = (d) =>
        d ? new Date(d).toLocaleDateString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

      console.log('Formatted values:');
      console.log(`  fmt(${txnAmount}) = "${fmt(txnAmount)}"`);
      console.log(`  fmtDate(${txnDate}) = "${fmtDate(txnDate)}"\n`);

      console.log('✅ Frontend rendering would succeed!\n');
    } catch (err) {
      console.error('❌ Frontend rendering failed:', err.message);
      console.error('Stack:', err.stack);
    }

    // Check schema
    console.log('═'.repeat(60));
    console.log('TRANSACTION SCHEMA (from model)');
    console.log('═'.repeat(60) + '\n');
    
    const schema = Transaction.schema;
    console.log('Expected fields:');
    Object.keys(schema.paths).forEach(path => {
      const schemaType = schema.paths[path];
      console.log(`  ${path}: ${schemaType.instance}`);
    });

    console.log('\n' + '═'.repeat(60));
    console.log('SHOW FIRST 5 TRANSACTIONS');
    console.log('═'.repeat(60) + '\n');

    transactions.slice(0, 5).forEach((txn, idx) => {
      console.log(`[${idx}] ${txn.type} | $${txn.amount} | ${txn.status} | ${txn._id}`);
    });

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

debug();
