#!/usr/bin/env node
/**
 * Fix missing uploaded file references
 * Clears payment proof for records where the file doesn't exist on disk
 * Users can then re-upload the correct file
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

const fixMissingUploads = async () => {
  console.log('\n🔧 Fixing missing upload references...\n');

  let fixedCount = 0;

  // Check InvestorInvestment
  const investorInvestments = await InvestorInvestment.find({ paymentProof: { $exists: true, $ne: null } });
  
  for (const inv of investorInvestments) {
    const proofPath = inv.paymentProof;
    if (proofPath.startsWith('/uploads/')) {
      const filename = proofPath.replace('/uploads/', '');
      const fullPath = path.join(uploadDir, filename);
      
      if (!fs.existsSync(fullPath)) {
        console.log(`❌ Clearing broken reference: ${inv._id}`);
        console.log(`   Path was: ${proofPath}`);
        
        await InvestorInvestment.findByIdAndUpdate(inv._id, {
          paymentProof: null,
          transactionId: inv.transactionId, // keep other fields
          paymentNote: inv.paymentNote
        });
        
        fixedCount++;
        console.log(`   ✅ Fixed\n`);
      }
    }
  }

  // Check Investment
  const investments = await Investment.find({ paymentProof: { $exists: true, $ne: null } });
  
  for (const inv of investments) {
    const proofPath = inv.paymentProof;
    if (proofPath.startsWith('/uploads/')) {
      const filename = proofPath.replace('/uploads/', '');
      const fullPath = path.join(uploadDir, filename);
      
      if (!fs.existsSync(fullPath)) {
        console.log(`❌ Clearing broken reference: ${inv._id}`);
        console.log(`   Path was: ${proofPath}`);
        
        await Investment.findByIdAndUpdate(inv._id, {
          paymentProof: null,
          transactionId: inv.transactionId,
          paymentNote: inv.paymentNote
        });
        
        fixedCount++;
        console.log(`   ✅ Fixed\n`);
      }
    }
  }

  console.log(`\n✅ Fixed ${fixedCount} records with missing files`);
  console.log('💡 Users can now re-upload payment proof\n');

  mongoose.connection.close();
};

connectDB().then(fixMissingUploads).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
