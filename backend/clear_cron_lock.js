/**
 * Clear stuck cron lock for testing
 */

require('dotenv').config();
const mongoose = require('mongoose');
const CronLock = require('./src/models/CronLock');

const clear = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const now = new Date();
    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    console.log(`Clearing lock for dateKey: ${dateKey}`);

    const result = await CronLock.deleteOne({
      jobName: 'dailyProfits',
      dateKey
    });

    console.log(`Deleted: ${result.deletedCount} lock(s)`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

clear();
