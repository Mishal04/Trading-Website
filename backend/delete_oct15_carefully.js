const mongoose = require('mongoose');
require('dotenv').config();
const Transaction = require('./src/models/Transaction');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trading');
    
    console.log('\n⚠️  CAREFULLY DELETING OCT 15, 2026 TRANSACTIONS ONLY\n');
    
    // Define Oct 15, 2026 date range ONLY
    const oct15Start = new Date('2026-10-15T00:00:00.000Z');
    const oct15End = new Date('2026-10-16T00:00:00.000Z');
    
    console.log(`Date Range:`);
    console.log(`  Start: ${oct15Start.toISOString()}`);
    console.log(`  End:   ${oct15End.toISOString()}\n`);
    
    // Count BEFORE delete
    const countBefore = await Transaction.countDocuments({
      date: { $gte: oct15Start, $lt: oct15End }
    });
    
    console.log(`Transactions to delete: ${countBefore}`);
    console.log(`⚠️  DELETING...\n`);
    
    // DELETE - very careful
    const result = await Transaction.deleteMany({
      date: { $gte: oct15Start, $lt: oct15End }
    });
    
    console.log(`✅ DELETED: ${result.deletedCount} transactions`);
    
    // Verify count AFTER
    const countAfter = await Transaction.countDocuments({
      date: { $gte: oct15Start, $lt: oct15End }
    });
    
    console.log(`\nVerification:`);
    console.log(`  Before: ${countBefore}`);
    console.log(`  After:  ${countAfter}`);
    
    if (countAfter === 0) {
      console.log(`\n✅ SUCCESS: All Oct 15 transactions deleted`);
    } else {
      console.log(`\n❌ WARNING: ${countAfter} transactions still remain`);
    }
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
