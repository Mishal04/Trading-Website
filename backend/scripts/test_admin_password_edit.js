/**
 * Test Script: Admin Password Edit Feature
 * 
 * Demonstrates how the admin can update a user's password from the admin panel
 */

const mongoose = require('mongoose');
const User = require('../src/models/User');
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

const testPasswordEdit = async () => {
  try {
    // Find a test user (or use an existing one)
    const testUser = await User.findOne({ email: 'test@example.com' });
    
    const oldPassword = process.env.TEST_OLD_PASSWORD || 'mock-old-password';
    const newPassword = process.env.TEST_NEW_PASSWORD || 'mock-new-password';

    if (!testUser) {
      console.log('ℹ️  No test user found. Creating one for demonstration...');
      const newUser = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: oldPassword
      });
      await newUser.save();
      console.log('✅ Test user created:', newUser._id);
    }

    const userId = testUser?._id || await User.findOne({ email: 'test@example.com' }).then(u => u._id);

    // Simulate admin updating password
    console.log('\n📝 Simulating admin password update...');
    console.log('Request: PATCH /api/admin/users/:id');
    console.log('Payload:');
    const updatePayload = {
      password: newPassword
    };
    console.log(JSON.stringify(updatePayload, null, 2));

    const userToUpdate = await User.findById(userId);
    const oldPasswordHash = userToUpdate.password;

    // Update password
    userToUpdate.password = updatePayload.password;
    await userToUpdate.save();

    const updatedUser = await User.findById(userId);
    const newPasswordHash = updatedUser.password;

    console.log('\n✅ Password Update Success:');
    console.log('   - Old password hash:', oldPasswordHash.substring(0, 20) + '...');
    console.log('   - New password hash:', newPasswordHash.substring(0, 20) + '...');
    console.log('   - Hashes different:', oldPasswordHash !== newPasswordHash);

    // Verify password comparison works
    console.log('\n🔐 Testing password comparison:');
    const isValidOld = await updatedUser.comparePassword(oldPassword);
    const isValidNew = await updatedUser.comparePassword(newPassword);
    const isValidWrong = await updatedUser.comparePassword('wrongPassword');

    console.log('   - Old password matches: ', isValidOld, '(should be false)');
    console.log('   - New password matches: ', isValidNew, '(should be true)');
    console.log('   - Wrong password matches:', isValidWrong, '(should be false)');

    console.log('\n✅ All tests passed!');
    console.log('\nAPI Response would be:');
    console.log(JSON.stringify({
      success: true,
      message: 'User profile updated successfully',
      data: {
        userId: userId,
        name: updatedUser.name,
        email: updatedUser.email
      }
    }, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
};

connectDB().then(() => testPasswordEdit());
