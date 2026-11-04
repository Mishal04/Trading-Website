require('dotenv').config();
const mongoose = require('mongoose');
const Investor = require('../src/models/Investor');

const createTestInvestor = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if test investor already exists
    const existing = await Investor.findOne({ email: 'test@investor.com' });
    if (existing) {
      console.log('Test investor already exists with email: test@investor.com');
      console.log('Password: Test@1234');
      process.exit(0);
    }

    // Create test investor
    const investor = new Investor({
      name: 'Test Investor',
      email: 'test@investor.com',
      password: 'Test@1234',
      phoneNumber: '+1234567890',
      isActive: true,
      plan: 'A'
    });

    await investor.save();
    console.log('✅ Test investor created successfully!');
    console.log('📧 Email: test@investor.com');
    console.log('🔐 Password: Test@1234');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createTestInvestor();
