const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function backupDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all collections
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log(`Backing up ${collections.length} collections...\n`);

    const backup = {
      timestamp: new Date().toISOString(),
      collections: {}
    };

    for (const colInfo of collections) {
      const colName = colInfo.name;
      const collection = db.collection(colName);
      const docs = await collection.find({}).toArray();
      backup.collections[colName] = docs;
      console.log(`  ✓ ${colName}: ${docs.length} documents`);
    }

    // Write to file with timestamp
    const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(__dirname, '..', 'backups', filename);
    
    // Ensure backups directory exists
    const backupsDir = path.dirname(filepath);
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
    
    console.log(`\n✅ Backup saved to: ${filepath}`);
    console.log(`   File size: ${(fs.statSync(filepath).size / 1024 / 1024).toFixed(2)} MB`);

    process.exit(0);
  } catch (err) {
    console.error('Backup error:', err);
    process.exit(1);
  }
}

backupDB();
