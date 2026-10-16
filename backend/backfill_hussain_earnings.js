const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('./src/models/User');
    const InvestorInvestment = require('./src/models/InvestorInvestment');
    const Investment = require('./src/models/Investment');
    const Transaction = require('./src/models/Transaction');
    const Notification = require('./src/models/Notification');
    const constants = require('./config/constants');
    
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║     BACKFILL: Muhammad Hussain Earnings (Join Date to Oct 15)      ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');
    
    // Find Muhammad Hussain
    const hussain = await User.findOne({ name: { $regex: 'Muhammad.*Hussein|Muhammad.*Hussain|Muhammadhussain', $options: 'i' } })
      .select('_id name email createdAt wallet ancestorPath')
      .populate('ancestorPath', '_id');
    
    if (!hussain) {
      console.log('❌ Muhammad Hussain not found');
      process.exit(1);
    }
    
    const joinDate = new Date(hussain.createdAt);
    const endDate = new Date('2026-10-15T23:59:59Z'); // Through Oct 15
    const today = new Date();
    
    console.log(`User: ${hussain.name}`);
    console.log(`Join Date: ${joinDate.toISOString().split('T')[0]}`);
    console.log(`Backfill Until: 2026-10-15`);
    console.log(`Today: ${today.toISOString().split('T')[0]}`);
    console.log(`Backfill Days: ${Math.floor((endDate - joinDate) / (1000 * 60 * 60 * 24))}\n`);
    
    if (endDate >= today) {
      console.log('⚠ Note: Backfill end date is today or future. Only backfilling through yesterday.\n');
    }
    
    const getDailyRateForInvestment = (amount, investmentStartDate) => {
      const monthsElapsed = (endDate.getFullYear() - investmentStartDate.getFullYear()) * 12 + 
                            (endDate.getMonth() - investmentStartDate.getMonth());
      
      if (monthsElapsed < 6) {
        if (amount >= 10000) return 0.0125;
        return 0.01;
      }
      if (monthsElapsed < 12) {
        if (amount >= 10000) return 0.01;
        return 0.0075;
      }
      return 0.09 / 12 / 30;
    };
    
    let totalROIBackfill = 0;
    let totalCommissionBackfill = 0;
    let roiTransactionsCreated = 0;
    let commissionTransactionsCreated = 0;
    
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('CALCULATING ROI FOR EACH DAY...\n');
    
    const currentDate = new Date(joinDate);
    currentDate.setHours(0, 0, 0, 0);
    
    const backfillEndDate = new Date(endDate);
    backfillEndDate.setHours(0, 0, 0, 0);
    
    while (currentDate <= backfillEndDate && currentDate < today) {
      // For each day, calculate daily ROI
      let dailyROI = 0;
      
      // Check wallet.capital on this date (assume it was already set)
      const hussainWallet = hussain.wallet?.capital || 0;
      if (hussainWallet > 0) {
        const dailyRate = hussainWallet >= 10000 ? 0.0125 : 0.01;
        dailyROI += hussainWallet * dailyRate;
      }
      
      // Check InvestorInvestment records active by this date
      const approvedInvsByDate = await InvestorInvestment.find({
        userId: hussain._id,
        status: 'active',
        approvedBy: { $ne: null },
        startDate: { $lte: currentDate }
      }).select('amount startDate').lean();
      
      for (const inv of approvedInvsByDate) {
        const dailyRate = getDailyRateForInvestment(inv.amount, inv.startDate);
        dailyROI += inv.amount * dailyRate;
      }
      
      // Check old Investment records active by this date
      const oldInvsByDate = await Investment.find({
        userId: hussain._id,
        status: 'active',
        createdAt: { $lte: currentDate }
      }).select('amount').lean();
      
      for (const inv of oldInvsByDate) {
        dailyROI += inv.amount * 0.01;
      }
      
      if (dailyROI > 0) {
        totalROIBackfill += dailyROI;
        roiTransactionsCreated++;
        
        if (roiTransactionsCreated <= 5 || roiTransactionsCreated % 10 === 0) {
          console.log(`  ${currentDate.toISOString().split('T')[0]}: $${dailyROI.toFixed(4)} ROI`);
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`  ... and ${roiTransactionsCreated - 5} more days`);
    console.log(`\n✓ Total ROI backfill: $${totalROIBackfill.toFixed(2)} (${roiTransactionsCreated} days)\n`);
    
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('CALCULATING COMMISSIONS FOR EACH DAY...\n');
    
    const LEVEL_RATES = constants.LEVEL_RATES;
    
    // Pre-fetch all downline members
    const downline = await User.find({
      ancestorPath: hussain._id,
      createdAt: { $lte: backfillEndDate }
    }).select('_id name wallet ancestorPath')
      .populate('ancestorPath', '_id')
      .lean();
    
    // Pre-fetch all investments for all downline members
    const memberIds = downline.map(m => m._id);
    const memberInvestorInvs = await InvestorInvestment.find({
      userId: { $in: memberIds },
      status: 'active',
      approvedBy: { $ne: null },
      startDate: { $lte: backfillEndDate }
    }).select('userId amount startDate').lean();
    
    const memberOldInvs = await Investment.find({
      userId: { $in: memberIds },
      status: 'active',
      createdAt: { $lte: backfillEndDate }
    }).select('userId amount').lean();
    
    // Group investments by user
    const invsByUser = {};
    const oldInvsByUser = {};
    
    for (const inv of memberInvestorInvs) {
      if (!invsByUser[inv.userId]) invsByUser[inv.userId] = [];
      invsByUser[inv.userId].push(inv);
    }
    
    for (const inv of memberOldInvs) {
      if (!oldInvsByUser[inv.userId]) oldInvsByUser[inv.userId] = [];
      oldInvsByUser[inv.userId].push(inv);
    }
    
    // Calculate commissions day by day using pre-fetched data
    const commissionDate = new Date(joinDate);
    commissionDate.setHours(0, 0, 0, 0);
    
    let daysWithCommissions = 0;
    
    while (commissionDate <= backfillEndDate && commissionDate < today) {
      let dayCommissions = 0;
      
      for (const member of downline) {
        // Check if member existed on this date
        const memberJoinDate = new Date(member.createdAt);
        if (memberJoinDate > commissionDate) continue;
        
        if (!member.ancestorPath) continue;
        
        const levelIdx = member.ancestorPath.findIndex(id => id._id.toString() === hussain._id.toString());
        if (levelIdx === -1) continue;
        
        const level = levelIdx + 1;
        if (level > 21) continue;
        
        // Calculate member's ROI on this date
        let memberROI = 0;
        
        const memberWallet = member.wallet?.capital || 0;
        if (memberWallet > 0) {
          const dailyRate = memberWallet >= 10000 ? 0.0125 : 0.01;
          memberROI += memberWallet * dailyRate;
        }
        
        const memberApprovedInvs = invsByUser[member._id] || [];
        for (const inv of memberApprovedInvs) {
          const invStartDate = new Date(inv.startDate);
          if (invStartDate > commissionDate) continue;
          
          const dailyRate = getDailyRateForInvestment(inv.amount, inv.startDate);
          memberROI += inv.amount * dailyRate;
        }
        
        const memberOldInvList = oldInvsByUser[member._id] || [];
        for (const inv of memberOldInvList) {
          memberROI += inv.amount * 0.01;
        }
        
        if (memberROI <= 0) continue;
        
        const rate = LEVEL_RATES[level];
        if (!rate || rate <= 0) continue;
        
        const commission = (memberROI * rate) / 100;
        dayCommissions += commission;
        commissionTransactionsCreated++;
      }
      
      if (dayCommissions > 0) {
        totalCommissionBackfill += dayCommissions;
        daysWithCommissions++;
        
        if (daysWithCommissions <= 3) {
          console.log(`  ${commissionDate.toISOString().split('T')[0]}: $${dayCommissions.toFixed(4)} commissions`);
        }
      }
      
      commissionDate.setDate(commissionDate.getDate() + 1);
    }
    
    console.log(`  ... and ${Math.max(0, daysWithCommissions - 3)} more days`);
    console.log(`\n✓ Total commission backfill: $${totalCommissionBackfill.toFixed(2)} (${commissionTransactionsCreated} transactions)\n`);
    
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                    BACKFILL SUMMARY                               ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');
    
    const totalBackfill = totalROIBackfill + totalCommissionBackfill;
    
    console.log(`ROI Backfill:          $${totalROIBackfill.toFixed(2)}`);
    console.log(`Commission Backfill:   $${totalCommissionBackfill.toFixed(2)}`);
    console.log(`${'─'.repeat(40)}`);
    console.log(`TOTAL BACKFILL:        $${totalBackfill.toFixed(2)}\n`);
    
    console.log(`Transactions to create: ${roiTransactionsCreated + commissionTransactionsCreated}`);
    console.log(`  - ROI transactions: ${roiTransactionsCreated}`);
    console.log(`  - Commission transactions: ${commissionTransactionsCreated}\n`);
    
    // ═══════════════════════════════════════════════════════════════════════════════
    console.log('APPLYING BACKFILL TO WALLET...\n');
    
    // Update wallet
    await User.findByIdAndUpdate(hussain._id, {
      $inc: {
        'wallet.roi': totalROIBackfill,
        'wallet.commission': totalCommissionBackfill,
        totalRoiEarned: totalROIBackfill,
        totalEarned: totalBackfill
      }
    });
    
    console.log(`✓ Updated ${hussain.name}'s wallet`);
    console.log(`  wallet.roi: +$${totalROIBackfill.toFixed(2)}`);
    console.log(`  wallet.commission: +$${totalCommissionBackfill.toFixed(2)}\n`);
    
    // Create summary transaction
    await Transaction.create({
      userId: hussain._id,
      type: 'adjustment',
      amount: totalBackfill,
      status: 'completed',
      description: `Backfill earnings from ${joinDate.toISOString().split('T')[0]} to 2026-10-15: ROI $${totalROIBackfill.toFixed(2)} + Commissions $${totalCommissionBackfill.toFixed(2)}`,
      metadata: {
        roiAmount: totalROIBackfill,
        commissionAmount: totalCommissionBackfill,
        periodStart: joinDate.toISOString(),
        periodEnd: '2026-10-15T23:59:59Z',
        daysProcessed: roiTransactionsCreated,
        backfillReason: 'One-time earnings correction for join date through Oct 15'
      }
    });
    
    console.log('✓ Created backfill transaction record\n');
    
    // Create notification
    await Notification.create({
      userId: hussain._id,
      title: 'Earnings Backfill Applied',
      message: `$${totalBackfill.toFixed(2)} has been credited to your account as backfill earnings from your join date through October 15.`,
      type: 'success'
    });
    
    console.log('✓ Created notification\n');
    
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ BACKFILL COMPLETE                             ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');
    
    console.log(`Muhammad Hussain's earnings from ${joinDate.toISOString().split('T')[0]} through Oct 15:`);
    console.log(`\n  💰 $${totalBackfill.toFixed(2)} has been added to his wallet\n`);
    console.log(`Today's cron (4 PM) will add today's earnings automatically.`);
    console.log(`No commission/ROI logic was modified.\n`);
    
    process.exit(0);
  } catch(e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();
