#!/usr/bin/env node
/**
 * Check and verify uploaded file references in database
 * Compares database entries with actual files on disk
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const InvestorInvestment = require('../src/models/InvestorInvestment');
const Investment = require('../src/models/Investment');

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const checkUploads = async () => {
  console.log('\n📁 Upload Directory:', uploadDir);
  console.log('Checking database references...\n');

  // Check InvestorInvestment
  const investorInvestments = await InvestorInvestment.find({ paymentProof: { $exists: true, $ne: null } });
  console.log(`Found ${investorInvestments.length} InvestorInvestment records with proof\n`);

  for (const inv of investorInvestments) {
    const proofPath = inv.paymentProof;
    if (proofPath.startsWith('/uploads/')) {
      const filename = proofPath.replace('/uploads/', '');
      const fullPath = path.join(uploadDir, filename);
      const exists = fs.existsSync(fullPath);
      
      console.log(`${exists ? '✅' : '❌'} ${inv._id}`);
      console.log(`   Path: ${proofPath}`);
      console.log(`   File: ${filename}`);
      console.log(`   Exists: ${exists}\n`);
    }
  }

  // Check Investment
  const investments = await Investment.find({ paymentProof: { $exists: true, $ne: null } });
  console.log(`\nFound ${investments.length} Investment records with proof\n`);

  for (const inv of investments) {
    const proofPath = inv.paymentProof;
    if (proofPath.startsWith('/uploads/')) {
      const filename = proofPath.replace('/uploads/', '');
      const fullPath = path.join(uploadDir, filename);
      const exists = fs.existsSync(fullPath);
      
      console.log(`${exists ? '✅' : '❌'} ${inv._id}`);
      console.log(`   Path: ${proofPath}`);
      console.log(`   File: ${filename}`);
      console.log(`   Exists: ${exists}\n`);
    }
  }

  console.log('\n📂 Files actually in uploads folder:');
  const files = fs.readdirSync(uploadDir).filter(f => f !== '.gitkeep');
  files.forEach(f => console.log(`   • ${f}`));

  console.log('\n✅ Check complete');
  mongoose.connection.close();
};

connectDB().then(checkUploads).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
