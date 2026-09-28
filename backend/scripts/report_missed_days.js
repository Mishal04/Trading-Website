const mongoose = require('mongoose');
require('dotenv').config();

const InvestorInvestment = require('../src/models/InvestorInvestment');
const User = require('../src/models/User');

async function reportMissedDays() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('═'.repeat(100));
    console.log('MISSED DAILY PAYMENTS REPORT');
    console.log('═'.repeat(100) + '\n');

    const activeInvestments = await InvestorInvestment.find({
      status: 'active'
    }).populate('userId', 'name email');

    console.log(`Analyzing ${activeInvestments.length} active Plan A/B investments...\n`);

    let totalMissedDays = 0;
    let totalOwed = 0;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Start of today

    for (const inv of activeInvestments) {
      if (!inv.userId) continue;
      
      // Skip test users
      if (inv.userId.name && inv.userId.name.startsWith('Test_Final_')) continue;
      if (inv.userId.email && inv.userId.email.endsWith('@test.com')) continue;

      const lastRoiDate = new Date(inv.lastRoiDate || inv.startDate);
      const lastRoiDay = new Date(lastRoiDate.getFullYear(), lastRoiDate.getMonth(), lastRoiDate.getDate());
      
      // Calculate missed days (days between last ROI date and today, excluding today)
      const missedDays = Math.floor((today - lastRoiDay) / (24 * 60 * 60 * 1000)) - 1;

      if (missedDays > 0) {
        const dailyRoiAmount = Number(((inv.amount * inv.dailyRate) / 100).toFixed(4));
        const totalOwedForInvestment = Number((dailyRoiAmount * missedDays).toFixed(4));

        console.log(`${inv.userId.name} (${inv.userId.email})`);
        console.log(`  Investment: Plan ${inv.plan} - $${inv.amount} @ ${(inv.dailyRate * 100).toFixed(2)}% daily`);
        console.log(`  Last ROI Date: ${lastRoiDate.toISOString().substring(0, 10)}`);
        console.log(`  Missed Days: ${missedDays}`);
        console.log(`  Daily ROI: $${dailyRoiAmount}`);
        console.log(`  Total Owed: $${totalOwedForInvestment}`);
        console.log();

        totalMissedDays += missedDays;
        totalOwed += totalOwedForInvestment;
      }
    }

    console.log('═'.repeat(100));
    console.log('SUMMARY');
    console.log('═'.repeat(100) + '\n');
    console.log(`Total active investments analyzed: ${activeInvestments.length}`);
    console.log(`Total missed daily payments: ${totalMissedDays} days`);
    console.log(`Total owed across all investments: $${totalOwed.toFixed(4)}`);
    console.log(`\nNote: These missed payments will be credited on the next cron run (tomorrow at 21:00 Dubai time).`);
    console.log(`      Each investment tracks its own lastRoiDate, so recovery is automatic.`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

reportMissedDays();
