/**
 * Migration Script: Copy phone numbers from Investor collection to User collection
 * 
 * This script finds investors that have phone numbers and copies them to the
 * corresponding User documents (matched by email).
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

const migratePhoneNumbers = async () => {
  try {
    console.log('\n📊 Starting phone number migration...\n');
    
    // Find all investors with phone numbers
    const investorsWithPhones = await Investor.find({ 
      phone: { $exists: true, $ne: '', $ne: null } 
    }).select('name email phone');
    
    console.log(`Found ${investorsWithPhones.length} investors with phone numbers\n`);
    
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const investor of investorsWithPhones) {
      try {
        // Find corresponding User by email
        const user = await User.findOne({ email: investor.email.toLowerCase() });
        
        if (!user) {
          console.log(`⚠️  No User found for investor ${investor.email} - Skipping`);
          skipped++;
          continue;
        }
        
        if (!user.phoneNumber && investor.phone) {
          // Update User with investor's phone number
          user.phoneNumber = investor.phone.trim();
          await user.save();
          updated++;
          console.log(`✅ Updated ${investor.email}: ${investor.phone}`);
        } else if (user.phoneNumber) {
          console.log(`⊘  User ${investor.email} already has phone: ${user.phoneNumber}`);
          skipped++;
        }
      } catch (err) {
        errors++;
        console.error(`❌ Error updating ${investor.email}:`, err.message);
      }
    }
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`✅ Updated: ${updated}`);
    console.log(`⊘  Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    
    // Verify the migration
    console.log('\n🔍 Verification...\n');
    
    const investorUsersWithPhones = await User.find({ 
      role: 'investor',
      phoneNumber: { $exists: true, $ne: '', $ne: null }
    }).select('name email phoneNumber');
    
    console.log(`✅ Total investor users with phone numbers: ${investorUsersWithPhones.length}\n`);
    
    if (investorUsersWithPhones.length > 0) {
      console.log('Sample of migrated users:');
      console.log('┌────────────────────────────────────────┐');
      console.log('│ NAME          │ EMAIL           │ PHONE │');
      console.log('├────────────────────────────────────────┤');
      
      investorUsersWithPhones.slice(0, 10).forEach(user => {
        const name = user.name?.substring(0, 13).padEnd(13);
        const email = user.email?.substring(0, 15).padEnd(15);
        const phone = user.phoneNumber;
        
        console.log(`│ ${name} │ ${email} │ ${phone} │`);
      });
      
      console.log('└────────────────────────────────────────┘');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
};

connectDB().then(() => migratePhoneNumbers());
