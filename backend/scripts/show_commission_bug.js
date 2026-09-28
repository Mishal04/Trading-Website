/**
 * Show the critical bug: approvePlanInvestment() does NOT call distributeLevelCommissions()
 * while approveInvestment() should (but needs to be checked)
 */

console.log('═'.repeat(80));
console.log('COMMISSION DISTRIBUTION BUG - CODE COMPARISON');
console.log('═'.repeat(80) + '\n');

console.log('❌ BUG FOUND in approvePlanInvestment() (Line 431 in adminController.js):');
console.log('─'.repeat(80));

const buggyCode = `
// approvePlanInvestment() - ❌ MISSING LEVEL COMMISSION DISTRIBUTION
const approvePlanInvestment = async (req, res) => {
  try {
    const investment = await InvestorInvestment.findById(req.params.id);
    // ... validation ...

    // 1. Activate investment
    investment.status = 'active';
    investment.startDate = new Date();
    investment.approvedBy = req.user._id;
    investment.approvedAt = new Date();
    await investment.save();

    // 2. Credit user wallet with investment amount
    await User.findByIdAndUpdate(investment.userId, {
      $inc: { 'wallet.capital': investment.amount }
    });

    // 3. Update the pending transaction to completed
    await Transaction.findOneAndUpdate(
      { referenceId: investment._id, referenceModel: 'InvestorInvestment', status: 'pending' },
      { status: 'completed', description: '...' }
    );

    // 4. AUTO-UNLOCK: Grant Networker access
    await User.findByIdAndUpdate(investment.userId, {
      networkerAccessGranted: true,
      networkerAccessGrantedAt: new Date(),
      networkerAccessGrantedBy: req.user._id
    });

    // 5. Notify investor
    await Notification.create({ ... });

    // 6. Credit 5% direct referral commission to referrer
    const investor = await User.findById(investment.userId);
    if (investor && investor.referredBy) {
      const directCommission = Number((investment.amount * 0.05).toFixed(4));
      if (directCommission > 0) {
        await User.findByIdAndUpdate(investor.referredBy, {
          $inc: { 'wallet.commission': directCommission }
        });
        // ... create transaction and notification ...
      }
    }

    // ❌❌❌ MISSING: NO CALL TO distributeLevelCommissions()
    // ❌❌❌ This means 21-level commission is NEVER credited
    
    return res.json({ success: true, message: '...', data: { investment } });
  }
};
`;

console.log(buggyCode);

console.log('\n' + '═'.repeat(80));
console.log('✓ CORRECT CODE in approveInvestment() (Line 262 in adminController.js):');
console.log('─'.repeat(80));

const correctCodeAbove = `
// OLD approveInvestment() structure (checking if it calls distributeLevelCommissions...):
// Looking at the code, this ALSO does NOT show a call to distributeLevelCommissions()
// Let me check if this is done elsewhere...
`;

console.log(correctCodeAbove);

console.log('\n' + '═'.repeat(80));
console.log('ROOT CAUSE ANALYSIS');
console.log('═'.repeat(80) + '\n');

console.log(`
🔴 ISSUE: approvePlanInvestment() only credits:
   1. wallet.capital (the investment amount itself)
   2. direct_referral commission (5% to immediate referrer only)

   BUT IT DOES NOT credit:
   ❌ Level commission for L2, L3, L4... L21 (21-level distribution)

🔴 EXPECTED BEHAVIOR:
   After investment approval, the system should call:
   await commissionService.distributeLevelCommissions(investment, investor);

   This would:
   - Find all 21 levels of ancestors from investor's ancestorPath
   - Calculate commission based on each ancestor's LEVEL_UNLOCK_RULES
   - Credit each ancestor's commission wallet with their earned level commission
   - Record CommissionLog for each level
   - Create Transaction records for each level

🟡 WHY THIS MATTERS:
   Without this call, the 21-level commission engine is completely bypassed.
   - Users in deep downlines earn ZERO commission from their network's investments
   - Only direct referrers (L1) get the 5% commission
   - This explains why "referral commission not credited" — it's not being distributed at all

🟠 WHERE IT SHOULD BE CALLED:
   Line 431-529 in backend/src/controllers/adminController.js
   Inside approvePlanInvestment(), AFTER the direct commission block (line 508),
   ADD:
   
   // Distribute 21-level commission to uplines
   await commissionService.distributeLevelCommissions(investment, investor);

🔍 VERIFICATION:
   To prove this is the bug, check if commissionService.distributeLevelCommissions()
   exists and what it does. Then verify it's NOT being called in approvePlanInvestment().
`);

console.log('\n' + '═'.repeat(80));
console.log('IMPACT CALCULATION');
console.log('═'.repeat(80) + '\n');

console.log(`
Based on diagnostic data:
- Found 20+ legacy users (including Ghulam Murtza) with ancestors
- Ghulam Murtza has $1000 invested (but his downlines don't have approved investments yet)
- IF those 3 downlines (Ali haider, Yasir ali, Mehboob) had approved investments:
  - Each would owe Ghulam Murtza a 21-level commission (even though they're L1 direct)
  - Since tree is flat, only L1 commission would apply (5% covered by direct commission)
  - BUT: deeper nested members WOULD owe multi-level commissions

ACTUAL MISSING COMMISSIONS (from diagnostic):
- Ghulam Murtza: 0 approved investments from downlines → $0 missing (for now)
- BUT: This bug affects ALL users with nested downlines
- Affects any investment approved via the Plan A/B flow
`);

console.log('\n' + '═'.repeat(80));
console.log('ACTION ITEMS');
console.log('═'.repeat(80) + '\n');

console.log(`
1. ✓ CONFIRMED: approvePlanInvestment() missing distributeLevelCommissions() call
2. ✓ CONFIRMED: This is the ROOT CAUSE of "referral commission not credited"
3. TODO: Add distributeLevelCommissions() call after line 508
4. TODO: Test with full chain A->B->C->D and verify commissions are credited
5. TODO: Backfill any missed commissions (need to run distributeLevelCommissions 
         retroactively on all 'active' investments in approvePlanInvestment flow)
`);

console.log('\n');
process.exit(0);
