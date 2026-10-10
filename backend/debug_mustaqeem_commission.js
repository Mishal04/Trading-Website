const db = require('./src/config/database.js');
const User = require('./src/models/User');
const InvestorInvestment = require('./src/models/InvestorInvestment');
const CommissionLog = require('./src/models/CommissionLog');

(async () => {
  try {
    // Find Mustaqeem
    const mustaqeem = await User.findOne({ 
      $or: [
        { firstName: 'Mustaqeem' },
        { email: { $regex: 'mustaq', $options: 'i' } }
      ]
    });

    if (!mustaqeem) {
      console.log('Mustaqeem not found');
      process.exit(1);
    }

    console.log('\n=== MUSTAQEEM PROFILE ===');
    console.log('ID:', mustaqeem._id);
    console.log('Name:', mustaqeem.firstName, mustaqeem.lastName);
    console.log('Email:', mustaqeem.email);
    console.log('Is Active:', mustaqeem.isActive);
    console.log('Total Invested:', mustaqeem.totalInvested);
    console.log('Direct Count:', mustaqeem.directCount);
    console.log('AncestorPath:', mustaqeem.ancestorPath);
    console.log('Wallet Commission:', mustaqeem.wallet?.commission);
    console.log('Wallet ROI:', mustaqeem.wallet?.roi);
    console.log('Wallet Profit:', mustaqeem.wallet?.profit);

    // Find Mustaqeem's investments (if they're an investor with Phase 2 investments)
    const investorInvests = await InvestorInvestment.find({ userId: mustaqeem._id });
    console.log('\n=== MUSTAQEEM AS INVESTOR (InvestorInvestment records) ===');
    console.log('Count:', investorInvests.length);
    investorInvests.forEach((inv, i) => {
      console.log(`  [${i}] $${inv.amount} @ ${(inv.dailyRate * 100).toFixed(2)}% daily | Status: ${inv.status} | Cap Reached: ${inv.capReached}`);
    });

    // Find Mustaqeem's direct referrals
    console.log('\n=== MUSTAQEEM\'S DIRECT REFERRALS ===');
    const directReferrals = await User.find({ parentId: mustaqeem._id }).select('_id firstName email wallet');
    console.log('Count:', directReferrals.length);
    
    let totalDirectInvested = 0;
    for (const ref of directReferrals) {
      const refInvests = await InvestorInvestment.find({ 
        userId: ref._id,
        status: 'active'
      });
      const activeCapital = refInvests.reduce((sum, inv) => sum + inv.amount, 0);
      console.log(`  - ${ref.firstName} (${ref.email}): $${activeCapital} active capital`);
      totalDirectInvested += activeCapital;
    }
    console.log('Total direct referral active capital:', totalDirectInvested);

    // Find recent commissions for Mustaqeem
    console.log('\n=== RECENT COMMISSION LOGS FOR MUSTAQEEM (as recipient) ===');
    const recentComms = await CommissionLog.find({ recipientId: mustaqeem._id })
      .sort({ createdAt: -1 })
      .limit(10);
    console.log('Count (last 10):', recentComms.length);
    recentComms.forEach(comm => {
      console.log(`  Level ${comm.level} @ ${comm.rate}% = $${comm.commissionAmount} from ${comm.sourceUserId}`);
    });

    // Check if Mustaqeem is in any ancestorPath of their direct referrals
    console.log('\n=== MUSTAQEEM IN ANCESTOR PATHS ===');
    for (const ref of directReferrals) {
      const inPath = ref.ancestorPath ? ref.ancestorPath.includes(mustaqeem._id.toString()) : false;
      console.log(`  ${ref.firstName}: ${inPath ? 'YES' : 'NO'}`);
    }

    console.log('\n=== END DEBUG ===\n');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
