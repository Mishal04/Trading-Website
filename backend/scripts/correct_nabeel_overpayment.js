require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('\n' + '='.repeat(120));
    console.log('CORRECT: Nabeel Haider ROI overpayment - remove weekend and duplicate transactions');
    console.log('='.repeat(120));
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    const InvestorInvestment = require('../src/models/InvestorInvestment');
    const Transaction = require('../src/models/Transaction');
    
    const nabeel = await User.findOne({ email: 'billajutt161@gmail.com' });
    const inv = await InvestorInvestment.findOne({ userId: nabeel._id, plan: 'A' }).sort({ amount: 1 });
    
    console.log(`\n👤 User: ${nabeel.name}`);
    console.log(`Current wallet.roi: $${nabeel.wallet.roi}`);
    console.log(`Current investment ROI: $${inv.totalRoiEarned}\n`);
    
    // Get all profit transactions
    const txs = await Transaction.find({ 
      userId: nabeel._id, 
      type: 'profit'
    }).sort({ createdAt: 1 });
    
    // Identify which to delete
    const toDelete = [];
    
    for (const tx of txs) {
      const desc = tx.description;
      const date = new Date(tx.createdAt).toISOString().split('T')[0];
      const dayNum = new Date(tx.createdAt).getDay();
      
      // Weekend backdated (Oct 5 = Sat, Oct 6 = Sun)
      if (desc.includes('Backdated') && (dayNum === 0 || dayNum === 6)) {
        console.log(`❌ DELETE: ${date} ${desc.substring(0, 50)}: $${tx.amount}`);
        toDelete.push({ id: tx._id, amount: tx.amount, reason: 'Weekend' });
      }
      // Duplicate Oct 9 (there are 4 on same date, keep only first)
      else if (date === '2026-10-09' && desc.includes('Daily ROI') && txs.filter(t => 
        new Date(t.createdAt).toISOString().split('T')[0] === '2026-10-09' && 
        t.description.includes('Daily ROI')
      ).indexOf(tx) > 0) {
        console.log(`❌ DELETE: ${date} ${desc.substring(0, 50)}: $${tx.amount} (DUPLICATE)`);
        toDelete.push({ id: tx._id, amount: tx.amount, reason: 'Duplicate' });
      }
    }
    
    const totalToRemove = toDelete.reduce((a, d) => a + d.amount, 0);
    
    console.log(`\n${toDelete.length} transactions to delete: -$${totalToRemove.toFixed(2)}`);
    
    if (toDelete.length === 0) {
      console.log('No corrections needed!');
      mongoose.disconnect();
      return;
    }
    
    console.log('\nProceeding with deletion...\n');
    
    // Delete transactions
    for (const del of toDelete) {
      await Transaction.findByIdAndDelete(del.id);
      console.log(`✓ Deleted: ${del.reason} - $${del.amount}`);
    }
    
    // Update user wallet and investment
    const newWalletRoi = nabeel.wallet.roi - totalToRemove;
    const newInvestmentRoi = inv.totalRoiEarned - totalToRemove;
    
    await User.findByIdAndUpdate(nabeel._id, {
      $set: {
        'wallet.roi': Math.max(0, newWalletRoi)
      }
    });
    
    await InvestorInvestment.findByIdAndUpdate(inv._id, {
      $set: {
        totalRoiEarned: Math.max(0, newInvestmentRoi)
      }
    });
    
    console.log(`\n✅ CORRECTED:`);
    console.log(`   Wallet ROI: $${nabeel.wallet.roi.toFixed(2)} → $${Math.max(0, newWalletRoi).toFixed(2)}`);
    console.log(`   Investment ROI: $${inv.totalRoiEarned.toFixed(2)} → $${Math.max(0, newInvestmentRoi).toFixed(2)}`);
    
    console.log(`\n=`.repeat(120));
    console.log('RESULT');
    console.log('='.repeat(120));
    console.log(`
Nabeel should have earned from Oct 2 deposit ($500 × 1%/day):
  Oct 3 (Thu): $5 ✓
  Oct 4 (Fri): $5 ✓
  Oct 7 (Mon): $5 ✓
  Oct 8 (Tue): $5 ✓
  Oct 9 (Wed): $5 ✓
  ─────────────
  Total: $25 ✓

New balance: $${Math.max(0, newWalletRoi).toFixed(2)} ✓
`);
    
    console.log('='.repeat(120) + '\n');
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
