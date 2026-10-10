const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('\n' + '='.repeat(100));
    console.log('✅ VERIFY: All Users Corrected');
    console.log('='.repeat(100) + '\n');

    // Get all users
    const allUsers = await User.find({}).select('name email wallet');
    console.log(`Total users: ${allUsers.length}\n`);

    let correctCount = 0;
    let incorrectCount = 0;
    const incorrectUsers = [];

    for (const user of allUsers) {
      // Calculate what ROI should be (one day only)
      const invs = await InvestorInvestment.find({
        userId: user._id,
        status: 'active'
      });

      const expectedRoi = invs.reduce((sum, inv) => sum + (inv.amount * inv.dailyRate), 0);
      const currentRoi = user.wallet?.roi || 0;

      if (Math.abs(currentRoi - expectedRoi) < 0.01) {
        correctCount++;
      } else {
        incorrectCount++;
        incorrectUsers.push({
          name: user.name || user.email,
          current: currentRoi,
          expected: expectedRoi,
          difference: currentRoi - expectedRoi
        });
      }
    }

    console.log(`✅ Correct: ${correctCount} users`);
    console.log(`❌ Incorrect: ${incorrectCount} users\n`);

    if (incorrectCount > 0) {
      console.log('Incorrect users:\n');
      incorrectUsers.slice(0, 10).forEach(u => {
        console.log(`  ${u.name}: $${u.current.toFixed(2)} (expected $${u.expected.toFixed(2)}, diff: $${u.difference.toFixed(2)})`);
      });
      if (incorrectCount > 10) {
        console.log(`  ... and ${incorrectCount - 10} more\n`);
      }

      // Fix them
      console.log('\n🔧 Fixing remaining incorrect users...\n');

      for (const u of incorrectUsers) {
        const user = await User.findOne({ $or: [{ name: u.name }, { email: u.name }] });
        if (user) {
          await User.findByIdAndUpdate(user._id, {
            $set: { 'wallet.roi': u.expected }
          });
        }
      }

      console.log(`✅ Fixed ${incorrectCount} users\n`);
    } else {
      console.log('✅ All users are correctly set!\n');
    }

    console.log('='.repeat(100));
    console.log('\n✅ VERIFICATION COMPLETE\n');
    console.log('='.repeat(100) + '\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
