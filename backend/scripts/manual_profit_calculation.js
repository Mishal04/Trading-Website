/**
 * Manually trigger daily profit calculation
 * This will create NEW transactions using the CORRECTED commission algorithm
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const profitService = require('../src/services/profitService');

async function runManualCalculation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('\nConnected to MongoDB');
    console.log('Triggering daily profit calculation with CORRECTED algorithm...\n');

    await profitService.calculateDailyProfits();

    console.log('\n✓ Daily profit calculation completed');
    console.log('✓ NEW transactions should now appear in the Transaction Ledger');
    console.log('✓ These will show commissions across multiple levels (not just L1)\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

runManualCalculation();
