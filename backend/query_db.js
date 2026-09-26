const mongoose = require('mongoose');
require('dotenv').config();

// Load models
const User = require('./src/models/User');
const Investor = require('./src/models/Investor');

const connectAndQuery = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('\n✓ Connected to MongoDB\n');

    const email = 'sania@gmail.com';

    // Query 1: Check User collection
    console.log('═══════════════════════════════════════════════════════════');
    console.log('1. QUERY USER COLLECTION FOR sania@gmail.com');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const userDoc = await User.findOne({ email }).lean();
    if (userDoc) {
      console.log('✓ FOUND in User collection:');
      console.log(JSON.stringify(userDoc, null, 2));
      console.log('\n');
    } else {
      console.log('✗ NOT FOUND in User collection\n');
    }

    // Query 2: Check Investor collection
    console.log('═══════════════════════════════════════════════════════════');
    console.log('2. QUERY INVESTOR COLLECTION FOR sania@gmail.com');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const investorDoc = await Investor.findOne({ email }).lean();
    if (investorDoc) {
      console.log('✓ FOUND in Investor collection:');
      console.log(JSON.stringify(investorDoc, null, 2));
      console.log('\n');
    } else {
      console.log('✗ NOT FOUND in Investor collection\n');
    }

    // Query 3: Check for orphaned Investor records (no corresponding User)
    console.log('═══════════════════════════════════════════════════════════');
    console.log('3. FIND ORPHANED INVESTOR RECORDS (no corresponding User)');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const allInvestors = await Investor.find().lean();
    console.log(`Total Investor documents: ${allInvestors.length}`);
    
    const orphanedInvestors = [];
    
    for (const investor of allInvestors) {
      const userExists = await User.findOne({ email: investor.email }).lean();
      if (!userExists) {
        orphanedInvestors.push(investor);
      }
    }
    
    console.log(`Orphaned Investor records (no User counterpart): ${orphanedInvestors.length}\n`);
    
    if (orphanedInvestors.length > 0) {
      console.log('Orphaned Investor records:');
      orphanedInvestors.forEach((inv, index) => {
        console.log(`\n[${index + 1}] Email: ${inv.email}, Name: ${inv.name}, ID: ${inv._id}`);
        console.log(`    Plan: ${inv.plan}, joinDate: ${inv.joinDate}`);
        console.log(`    Wallet - Capital: ${inv.wallet.capital}, ROI: ${inv.wallet.roi}`);
        console.log(`    totalInvested: ${inv.totalInvested}, totalRoiEarned: ${inv.totalRoiEarned}`);
      });
    } else {
      console.log('✓ No orphaned Investor records found — all Investors have corresponding Users.');
    }

    // Query 4: Show both collections summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('4. SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const totalUsers = await User.countDocuments();
    const totalInvestors = await Investor.countDocuments();
    
    console.log(`Total User documents: ${totalUsers}`);
    console.log(`Total Investor documents: ${totalInvestors}`);
    console.log(`Orphaned Investor records: ${orphanedInvestors.length}`);

    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

connectAndQuery();
