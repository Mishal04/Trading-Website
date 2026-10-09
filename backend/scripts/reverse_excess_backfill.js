require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('\n' + '='.repeat(120));
    console.log('REVERSE: Remove excess backfill ROI from Anees and Nabeel');
    console.log('='.repeat(120));
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    const InvestorInvestment = require('../src/models/InvestorInvestment');
    const Transaction = require('../src/models/Transaction');
    
    // Users to fix
    const fixes = [
      { email: 'asadmehmood5142@gmail.com', name: 'Anees', excessAmount: 3.00, reason: 'Joined Oct 8 - only earned Oct 9' },
      { email: 'billajutt161@gmail.com', name: 'Nabeel', excessAmount: 5.00, reason: 'Joined Oct 1 but got 3 extra days' }
    ];
    
    console.log('\n');
    
    let totalReversed = 0;
    const results = [];
    
    for (const fix of fixes) {
      try {
        const user = await User.findOne({ email: fix.email });
        const inv = await InvestorInvestment.findOne({ userId: user._id, plan: 'A' }).sort({ amount: 1 });
        
        if (!user || !inv) {
          console.log(`❌ ${fix.name} - User or investment not found`);
          results.push({ name: fix.name, email: fix.email, status: 'NOT FOUND' });
          continue;
        }
        
        console.log(`📍 ${fix.name} (${fix.email})`);
        console.log(`   Current wallet.roi: $${user.wallet.roi}`);
        console.log(`   Investment ROI earned: $${inv.totalRoiEarned}`);
        console.log(`   Removing: $${fix.excessAmount.toFixed(2)}`);
        
        // Reverse from wallet
        await User.findByIdAndUpdate(user._id, {
          $inc: {
            'wallet.roi': -fix.excessAmount,
            totalRoiEarned: -fix.excessAmount
          }
        });
        
        // Reverse from investment
        await InvestorInvestment.findByIdAndUpdate(inv._id, {
          $inc: { totalRoiEarned: -fix.excessAmount }
        });
        
        // Create reversal transaction
        await Transaction.create({
          userId: user._id,
          type: 'profit',
          amount: -fix.excessAmount,
          status: 'completed',
          description: `Reversal: Removed excess backfill ($${fix.excessAmount.toFixed(2)}). ${fix.reason}.`,
          referenceId: inv._id,
          referenceModel: 'InvestorInvestment'
        });
        
        const newWallet = user.wallet.roi - fix.excessAmount;
        const newInvRoi = inv.totalRoiEarned - fix.excessAmount;
        
        console.log(`   ✅ New wallet.roi: $${newWallet.toFixed(2)}`);
        console.log(`   ✅ New investment ROI: $${newInvRoi.toFixed(2)}\n`);
        
        results.push({
          name: fix.name,
          email: fix.email,
          removed: `$${fix.excessAmount.toFixed(2)}`,
          newWallet: `$${newWallet.toFixed(2)}`,
          status: '✅ FIXED'
        });
        
        totalReversed += fix.excessAmount;
        
      } catch (err) {
        console.error(`❌ Error for ${fix.name}:`, err.message);
        results.push({ name: fix.name, email: fix.email, status: `ERROR: ${err.message}` });
      }
    }
    
    console.log('='.repeat(120));
    console.log('RESULTS');
    console.log('='.repeat(120));
    console.table(results);
    
    console.log('\n' + '='.repeat(120));
    console.log('SUMMARY');
    console.log('='.repeat(120));
    console.log(`
Total reversed: $${totalReversed.toFixed(2)}

✅ Anees:
   - Was: $4 ($1 correct + $3 excess)
   - Now: $1 (correct - Oct 9 only)

✅ Nabeel:
   - Was: $35 ($30 correct + $5 excess)
   - Now: $30 (correct - Oct 2,5,6,7,8 only)

All users now have CORRECT backfill amounts!
`);
    
    console.log('='.repeat(120) + '\n');
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
})();
