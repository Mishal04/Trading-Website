/**
 * Backup production database to JSON before Phase 4 reset
 * Creates timestamped backup files in /backups directory
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import all models
const User = require('../src/models/User');
const Investment = require('../src/models/Investment');
const InvestorInvestment = require('../src/models/InvestorInvestment');
const Transaction = require('../src/models/Transaction');
const CommissionLog = require('../src/models/CommissionLog');
const Withdrawal = require('../src/models/Withdrawal');
const Notification = require('../src/models/Notification');
const TeamTree = require('../src/models/TeamTree');

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

async function backupDatabase() {
  try {
    console.log('🔄 Connecting to production database...');
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log('✅ Connected\n');

    const backupData = {
      timestamp: new Date().toISOString(),
      timestamp_readable: new Date().toLocaleString(),
      collections: {}
    };

    // Backup all collections
    const collections = [
      { name: 'users', model: User, desc: 'User accounts (auth, profile, wallet, referral tree)' },
      { name: 'investments', model: Investment, desc: 'Old investment model records' },
      { name: 'investorinvestments', model: InvestorInvestment, desc: 'Plan A/B investment records' },
      { name: 'transactions', model: Transaction, desc: 'Transaction history (investments, withdrawals, commissions)' },
      { name: 'commissionlogs', model: CommissionLog, desc: 'Commission earning records' },
      { name: 'withdrawals', model: Withdrawal, desc: 'Withdrawal requests' },
      { name: 'notifications', model: Notification, desc: 'User notifications' },
      { name: 'teamtrees', model: TeamTree, desc: 'Team structure records' }
    ];

    for (const { name, model, desc } of collections) {
      try {
        console.log(`📦 Backing up ${name}...`);
        const data = await model.find({}).lean();
        backupData.collections[name] = {
          count: data.length,
          description: desc,
          records: data
        };
        console.log(`   ✅ ${data.length} records`);
      } catch (err) {
        console.warn(`   ⚠️  Error backing up ${name}: ${err.message}`);
        backupData.collections[name] = { count: 0, error: err.message, records: [] };
      }
    }

    // Write backup file
    const backupFile = path.join(backupDir, `production_backup_${timestamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    const stats = fs.statSync(backupFile);

    console.log(`\n✅ BACKUP COMPLETE`);
    console.log(`📁 File: ${backupFile}`);
    console.log(`📊 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`🕐 Created: ${new Date(stats.mtime).toISOString()}`);
    console.log(`📝 Records backed up:`);

    let totalRecords = 0;
    for (const [name, data] of Object.entries(backupData.collections)) {
      console.log(`   - ${name}: ${data.count}`);
      totalRecords += data.count;
    }
    console.log(`\n📊 TOTAL RECORDS: ${totalRecords}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

backupDatabase();
