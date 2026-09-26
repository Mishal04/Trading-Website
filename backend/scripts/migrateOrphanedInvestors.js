/**
 * Migration Script: Move orphaned Investor records to User collection
 * 
 * Phase 1→2 Merge Cleanup:
 * - Some Investor accounts (e.g., sania@gmail.com) were never migrated to the User collection
 * - This script finds these orphaned Investor records and creates corresponding User documents
 * - It preserves all investor-related fields (plan, wallet, totalInvested, totalRoiEarned, etc.)
 * 
 * Run with: node scripts/migrateOrphanedInvestors.js
 */

require('dotenv').config({ path: `${__dirname}/../.env` });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Investor = require('../src/models/Investor');
const InvestorInvestment = require('../src/models/InvestorInvestment');

async function main() {
  try {
    console.log('🔄 Connecting to database...');
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
      throw new Error('MONGODB_URI not found in .env');
    }
    await mongoose.connect(uri);
    console.log('✅ Connected\n');

    // Step 1: Find all Investor records
    console.log('📋 Finding all Investor records...');
    const investors = await Investor.find().lean();
    console.log(`   Found ${investors.length} Investor(s)\n`);

    // Step 2: Find orphaned records (no corresponding User)
    console.log('🔍 Identifying orphaned Investor records (no User counterpart)...');
    const orphaned = [];
    for (const inv of investors) {
      const user = await User.findOne({ email: inv.email.toLowerCase() });
      if (!user) {
        orphaned.push(inv);
        console.log(`   ⚠️  Orphaned: ${inv.email} (Investor._id: ${inv._id})`);
      }
    }
    console.log(`\n   Total orphaned: ${orphaned.length}\n`);

    if (orphaned.length === 0) {
      console.log('✅ No orphaned records found. Migration complete.');
      await mongoose.connection.close();
      return;
    }

    // Step 3: Migrate each orphaned Investor to User collection
    console.log('📤 Migrating orphaned Investor records to User collection...\n');
    const results = { success: 0, failed: 0, errors: [] };

    for (const inv of orphaned) {
      try {
        console.log(`   Processing ${inv.email}...`);

        // Generate a referral code for this user
        const referralCode = generateReferralCode();

        // Create User document from Investor data
        // If investor has no password, generate a temporary plaintext one
        // (DO NOT hash here — User model's pre-save hook will hash it)
        const tempPassword = require('crypto').randomBytes(8).toString('hex');
        const newUser = new User({
          name: inv.name,
          email: inv.email.toLowerCase(),
          password: tempPassword, // Plaintext; pre-save hook will hash it exactly once
          referralCode,
          isVerified: inv.isVerified,
          investmentLevel: 'none',
          totalProfitEarned: 0,
          teamBusiness: { strongTeam: 0, otherTeam: 0, total: 0 },
          commissions: { levelCommissions: Array(25).fill(0), leadershipSalary: 0, performanceReward: 0 },
          referrals: { count: 0, activeCount: 0, totalBusiness: 0 },
          ancestorPath: [],
          wallet: {
            capital: inv.wallet?.capital || 0,
            profit: 0,
            commission: 0,
            roi: inv.wallet?.roi || 0
          },
          lastLogin: inv.lastLogin,
          isActive: inv.isActive !== false, // Default true
          role: 'investor',
          totalInvested: inv.totalInvested || 0,
          totalEarned: inv.totalRoiEarned || 0, // Use totalRoiEarned as initial totalEarned
          directCount: 0,
          unlockedLevels: 0,
          achievementsClaimed: [],
          accountType: 'user',
          plan: inv.plan || 'A',
          joinDate: inv.joinDate || null,
          totalRoiEarned: inv.totalRoiEarned || 0,
          networkerAccessGranted: false
        });

        const savedUser = await newUser.save();
        console.log(`   ✅ Created User (User._id: ${savedUser._id})`);

        // Step 4: Update InvestorInvestment records to reference new User
        const invInvestments = await InvestorInvestment.find({ investorId: inv._id });
        if (invInvestments.length > 0) {
          console.log(`      Updating ${invInvestments.length} investment(s)...`);
          await InvestorInvestment.updateMany(
            { investorId: inv._id },
            { userId: savedUser._id, investorId: null }
          );
          console.log(`      ✅ Updated investments to reference new User`);
        }

        results.success++;
      } catch (err) {
        console.error(`   ❌ Failed to migrate ${inv.email}:`, err.message);
        results.failed++;
        results.errors.push({ email: inv.email, error: err.message });
      }
    }

    // Step 5: Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary');
    console.log('='.repeat(60));
    console.log(`✅ Successfully migrated: ${results.success}`);
    console.log(`❌ Failed: ${results.failed}`);
    if (results.errors.length > 0) {
      console.log('\nErrors:');
      results.errors.forEach(e => console.log(`   - ${e.email}: ${e.error}`));
    }

    console.log('\n✨ Migration complete!');
    await mongoose.connection.close();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

function generateReferralCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

main();
