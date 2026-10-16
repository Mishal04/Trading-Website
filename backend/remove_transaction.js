const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const Transaction = require('./src/models/Transaction');
    
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║          REMOVING: Backfill Transaction Record                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');
    
    // Find and delete the transaction
    const result = await Transaction.deleteMany({
      type: 'adjustment',
      description: { $regex: 'Backfill earnings' }
    });
    
    console.log(`Deleted ${result.deletedCount} transaction record(s)\n`);
    
    if (result.deletedCount > 0) {
      console.log('✓ Transaction(s) removed from database\n');
      console.log('╔════════════════════════════════════════════════════════════════════╗');
      console.log('║                  ✅ REMOVAL COMPLETE                              ║');
      console.log('╚════════════════════════════════════════════════════════════════════╝\n');
    } else {
      console.log('⚠ No matching transaction found\n');
    }
    
    process.exit(0);
  } catch(e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();
