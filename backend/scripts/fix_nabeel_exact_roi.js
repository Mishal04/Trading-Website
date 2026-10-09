require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('\n' + '='.repeat(120));
    console.log('ANALYSIS: Nabeel Haider ROI correction - Oct 2 deposit');
    console.log('='.repeat(120));
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    const InvestorInvestment = require('../src/models/InvestorInvestment');
    const Transaction = require('../src/models/Transaction');
    
    const nabeel = await User.findOne({ email: 'billajutt161@gmail.com' });
    const inv = await InvestorInvestment.findOne({ userId: nabeel._id, plan: 'A' }).sort({ amount: 1 });
    
    console.log(`\n👤 User: ${nabeel.name} (${nabeel.email})`);
    console.log(`💰 Investment: $${inv.amount} on Oct 2`);
    console.log(`📊 Current wallet.roi: $${nabeel.wallet.roi}`);
    console.log(`📊 Current investment ROI: $${inv.totalRoiEarned}\n`);
    
    // Get all transactions for this user
    const txs = await Transaction.find({ userId: nabeel._id }).sort({ createdAt: 1 });
    
    console.log('='.repeat(120));
    console.log('TRANSACTION HISTORY');
    console.log('='.repeat(120));
    
    let totalROI = 0;
    const roi_txs = txs.filter(t => t.type === 'profit');
    
    roi_txs.forEach((tx, idx) => {
      const date = new Date(tx.createdAt).toISOString().split('T')[0];
      const amount = tx.amount;
      totalROI += amount;
      console.log(`${idx + 1}. ${date}: ${tx.description.substring(0, 60)} → $${amount.toFixed(2)} (Total: $${totalROI.toFixed(2)})`);
    });
    
    console.log('\n' + '='.repeat(120));
    console.log('CORRECT CALCULATION');
    console.log('='.repeat(120));
    
    console.log(`
Deposit: Oct 2 (Wednesday)
Daily Rate: 1% = $5/day

Trading days Nabeel should have earned:
  Oct 3 (Thu):    ✓ TRADING DAY - $5
  Oct 4 (Fri):    ✓ TRADING DAY - $5
  Oct 5 (Sat):    ❌ WEEKEND - $0
  Oct 6 (Sun):    ❌ WEEKEND - $0
  Oct 7 (Mon):    ✓ TRADING DAY - $5
  Oct 8 (Tue):    ✓ TRADING DAY - $5
  Oct 9 (Wed):    ✓ TRADING DAY - $5
  ─────────────────────────────────
  CORRECT TOTAL:           $25.00

Current total from transactions: $${totalROI.toFixed(2)}
Difference: $${(totalROI - 25).toFixed(2)} ${totalROI > 25 ? '❌ OVERPAID' : '⚠️ UNDERPAID'}
`);
    
    console.log('='.repeat(120));
    console.log('ISSUES FOUND');
    console.log('='.repeat(120));
    
    const issues = [];
    
    // Check for weekend transactions
    const weekendTxs = roi_txs.filter(tx => {
      const date = new Date(tx.createdAt);
      const day = date.getDay();
      return (day === 0 || day === 6) && tx.description.includes('Backdated');
    });
    
    if (weekendTxs.length > 0) {
      console.log(`❌ Found ${weekendTxs.length} weekend transactions that should not be here:`);
      weekendTxs.forEach(tx => {
        console.log(`   - ${new Date(tx.createdAt).toISOString().split('T')[0]}: $${tx.amount}`);
      });
      issues.push(`Weekend backdated transactions: $${weekendTxs.reduce((a,t) => a + t.amount, 0)}`);
    }
    
    // Check for duplicates
    const dateGroups = {};
    roi_txs.forEach(tx => {
      const date = new Date(tx.createdAt).toISOString().split('T')[0];
      if (!dateGroups[date]) dateGroups[date] = [];
      dateGroups[date].push(tx);
    });
    
    const duplicateDates = Object.keys(dateGroups).filter(d => dateGroups[d].length > 1);
    if (duplicateDates.length > 0) {
      console.log(`⚠️  Found duplicate transactions on same date:`);
      duplicateDates.forEach(d => {
        console.log(`   - ${d}: ${dateGroups[d].length} transactions`);
        dateGroups[d].forEach(t => console.log(`      $${t.amount} - ${t.description.substring(0, 40)}`));
      });
      issues.push(`Duplicate same-day transactions`);
    }
    
    console.log('\n' + '='.repeat(120));
    console.log('RECOMMENDATION');
    console.log('='.repeat(120));
    
    if (totalROI > 25) {
      const excess = totalROI - 25;
      console.log(`
Nabeel has been overpaid by $${excess.toFixed(2)}.

Action needed:
1. Remove weekend backdated transactions (Oct 5 & 6): -$10
2. Remove duplicate Oct 9 transaction: -$5
3. Remove reversal transaction: +$5 (it was a correction)
4. Net adjustment: -$${excess.toFixed(2)}

Final balance should be: $25.00
`);
    }
    
    console.log('='.repeat(120) + '\n');
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
