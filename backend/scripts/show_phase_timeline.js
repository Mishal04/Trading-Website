require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    console.log('\n' + '='.repeat(110));
    console.log('COMPLETE TIMELINE: Anees and Shaharyar Phase Transitions (3-Phase ROI Journey)');
    console.log('='.repeat(110));
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('../src/models/User');
    const InvestorInvestment = require('../src/models/InvestorInvestment');
    const investorConstants = require('../config/investorConstants');
    
    const anees = await User.findOne({ email: 'asadmehmood5142@gmail.com' });
    const shaharyar = await User.findOne({ email: 'shaharyarkhan300@gmail.com' });
    
    const aneesInv = await InvestorInvestment.findOne({ userId: anees._id });
    const shaharyarInv = await InvestorInvestment.findOne({ userId: shaharyar._id });
    
    console.log('\n🕐 KEY DATES:');
    console.log('='.repeat(110));
    
    const aneesCreated = new Date(aneesInv.createdAt);
    const shaharyarCreated = new Date(shaharyarInv.createdAt);
    
    // Phase 1 end (6 months from creation)
    const aneesPhase1End = new Date(aneesCreated);
    aneesPhase1End.setMonth(aneesPhase1End.getMonth() + 6);
    
    const shaharyarPhase1End = new Date(shaharyarCreated);
    shaharyarPhase1End.setMonth(shaharyarPhase1End.getMonth() + 6);
    
    // Phase 2 end (12 months from creation)
    const aneesPhase2End = new Date(aneesCreated);
    aneesPhase2End.setMonth(aneesPhase2End.getMonth() + 12);
    
    const shaharyarPhase2End = new Date(shaharyarCreated);
    shaharyarPhase2End.setMonth(shaharyarPhase2End.getMonth() + 12);
    
    console.log(`Anees investment created:      ${aneesCreated.toISOString().split('T')[0]}`);
    console.log(`Shaharyar investment created:  ${shaharyarCreated.toISOString().split('T')[0]}`);
    
    console.log('\n' + '='.repeat(110));
    console.log('📅 ANEES TIMELINE ($100 Admin Deposit)');
    console.log('='.repeat(110));
    
    console.log(`\n✓ PHASE 1 (Plan A): ${aneesCreated.toISOString().split('T')[0]} → ${aneesPhase1End.toISOString().split('T')[0]}`);
    console.log(`  Duration: 6 months`);
    console.log(`  Rate: 1.00% daily`);
    console.log(`  Daily ROI: $1.00`);
    console.log(`  6-Month earnings: $1.00/day × 180 days = $180.00`);
    console.log(`  Income earned: $1 (so far) + $179 (by end of Phase 1) = $180`);
    
    console.log(`\n✓ PHASE 2 (Plan B): ${aneesPhase1End.toISOString().split('T')[0]} → ${aneesPhase2End.toISOString().split('T')[0]}`);
    console.log(`  Duration: 6 months`);
    console.log(`  Rate: 0.75% daily (reduced from 1%)`);
    console.log(`  Daily ROI: $0.75`);
    console.log(`  6-Month earnings: $0.75/day × 180 days = $135.00`);
    console.log(`  Income earned so far: $180 + $135 = $315.00`);
    console.log(`  ⚠️  INCOME CAP REACHED! ($300 cap) - Investment marked as 'completed'`);
    
    console.log(`\n⏸️  PHASE 3 (8% monthly): After ${aneesPhase2End.toISOString().split('T')[0]}`);
    console.log(`  Status: Investment will be completed (cap reached in Phase 2)`);
    console.log(`  No further ROI earnings`);
    console.log(`  Maximum earned: $300 (3× investment amount)`);
    
    console.log('\n' + '='.repeat(110));
    console.log('📅 SHAHARYAR TIMELINE ($300 Approved Investment)');
    console.log('='.repeat(110));
    
    console.log(`\n✓ PHASE 1 (Plan A): ${shaharyarCreated.toISOString().split('T')[0]} → ${shaharyarPhase1End.toISOString().split('T')[0]}`);
    console.log(`  Duration: 6 months`);
    console.log(`  Rate: 1.00% daily`);
    console.log(`  Daily ROI: $3.00`);
    console.log(`  6-Month earnings: $3.00/day × 180 days = $540.00`);
    console.log(`  Income earned: $9 (so far) + $531 (by end of Phase 1) = $540`);
    
    console.log(`\n✓ PHASE 2 (Plan B): ${shaharyarPhase1End.toISOString().split('T')[0]} → ${shaharyarPhase2End.toISOString().split('T')[0]}`);
    console.log(`  Duration: 6 months`);
    console.log(`  Rate: 0.75% daily (reduced from 1%)`);
    console.log(`  Daily ROI: $2.25`);
    console.log(`  6-Month earnings: $2.25/day × 180 days = $405.00`);
    console.log(`  Income earned so far: $540 + $405 = $945.00`);
    console.log(`  ⚠️  INCOME CAP EXCEEDED! ($900 cap) - Investment marked as 'completed'`);
    
    console.log(`\n⏸️  PHASE 3 (8% monthly): After ${shaharyarPhase2End.toISOString().split('T')[0]}`);
    console.log(`  Status: Investment will be completed (cap exceeded in Phase 2)`);
    console.log(`  No further ROI earnings`);
    console.log(`  Maximum earned: $900 (3× investment amount)`);
    
    console.log('\n' + '='.repeat(110));
    console.log('🎯 INCOME CAP MECHANICS');
    console.log('='.repeat(110));
    
    console.log(`
Both investments have 3× income cap enforcement:

Anees:
  Investment: $100
  Income Cap: $100 × 3 = $300
  Phase 1 earnings: $180 (under cap)
  Phase 2 earnings: $120 (reaches $300 cap) → Investment marked 'completed'
  Phase 3: Not entered (already capped)

Shaharyar:
  Investment: $300
  Income Cap: $300 × 3 = $900
  Phase 1 earnings: $540 (under cap)
  Phase 2 earnings: $360 (exceeds $900 cap at day ~133) → Investment marked 'completed'
  Phase 3: Not entered (already capped)
`);
    
    console.log('\n' + '='.repeat(110));
    console.log('✅ SUMMARY: How Phase Transitions Work');
    console.log('='.repeat(110));
    
    console.log(`
Automatic Transitions (no admin action needed):
  ✓ Phase 1 → Phase 2: Automatically detected by cron at 6-month mark
  ✓ Phase 2 → Phase 3: Automatically detected by cron at 12-month mark
  ✓ Income Cap: Automatically stopped when totalRoiEarned ≥ incomeCap

Daily Cron Process (4 PM Pakistan time, Mon-Fri):
  1. Check investment age via getInvestmentPhase(createdAt)
  2. Call getDailyRateForPhase() to get current rate
  3. Calculate daily ROI = amount × rate
  4. Check if would exceed 3× income cap
  5. If yes → mark investment 'completed', stop future credits
  6. If no → credit ROI to wallet.roi

Both Anees and Shaharyar WILL get Phase 3 benefits IF their income cap is NOT reached!
`);
    
    console.log('='.repeat(110) + '\n');
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
