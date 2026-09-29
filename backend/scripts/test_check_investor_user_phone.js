/**
 * Test Script: Check if phone numbers are being saved to User collection
 * when investors register
 */

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Investor = require('../src/models/Investor');
require('dotenv').config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const checkInvestorUsers = async () => {
  try {
    console.log('\n📊 Checking all Users with role "investor"...\n');
    
    const investorUsers = await User.find({ role: 'investor' }).select('name email phoneNumber accountType role createdAt');
    
    console.log(`Found ${investorUsers.length} investor users\n`);
    
    if (investorUsers.length === 0) {
      console.log('⚠️  No investor users found in User collection');
      console.log('\nThis means when investors registered, no User account was created.');
      console.log('Old code might not have created User accounts.');
    } else {
      console.log('┌─────────────────────────────────────────────────────────┐');
      console.log('│ NAME              │ EMAIL            │ PHONE           │');
      console.log('├─────────────────────────────────────────────────────────┤');
      
      let phonesWithData = 0;
      let phonesEmpty = 0;
      
      investorUsers.forEach(user => {
        const name = user.name?.substring(0, 15).padEnd(15);
        const email = user.email?.substring(0, 16).padEnd(16);
        const phone = user.phoneNumber || '(empty)';
        
        console.log(`│ ${name} │ ${email} │ ${phone} │`);
        
        if (user.phoneNumber) {
          phonesWithData++;
        } else {
          phonesEmpty++;
        }
      });
      
      console.log('└─────────────────────────────────────────────────────────┘');
      console.log(`\n✅ Users with phone: ${phonesWithData}`);
      console.log(`❌ Users without phone: ${phonesEmpty}`);
    }
    
    console.log('\n📊 Checking all Investors...\n');
    
    const investors = await Investor.find({}).select('name email phone createdAt');
    console.log(`Found ${investors.length} investors\n`);
    
    if (investors.length > 0) {
      console.log('┌────────────────────────────────────────┐');
      console.log('│ NAME          │ EMAIL           │ PHONE │');
      console.log('├────────────────────────────────────────┤');
      
      investors.slice(0, 5).forEach(inv => {
        const name = inv.name?.substring(0, 13).padEnd(13);
        const email = inv.email?.substring(0, 15).padEnd(15);
        const phone = inv.phone || '(empty)';
        
        console.log(`│ ${name} │ ${email} │ ${phone} │`);
      });
      
      console.log('└────────────────────────────────────────┘');
      
      if (investors.length > 5) {
        console.log(`\n... and ${investors.length - 5} more investors`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
};

connectDB().then(() => checkInvestorUsers());
