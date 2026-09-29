/**
 * Diagnose Mustafa's missing daily profit issue
 */

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Investment = require('../src/models/Investment');
const Transaction = require('../src/models/Transaction');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected\n');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
};

const diagnose = async () => {
  try {
    // Find Mustafa
    const mustafa = await User.findOne({ name: /mustafa/i });
    
    if (!mustafa) {
      console.log('❌ Mustafa not found');
      return;
    }

    console.log('👤 MUSTAFA DATA:');
    console.log(`   Email: ${mustafa.email}`);
    console.log(`   ID: ${mustafa._id}`);
    console.log(`   Wallet: ${JSON.stringify(mustafa.wallet)}`);
    console.log(`   Total Profit Earned: $${mustafa.totalProfitEarned}`);
    console.log(`   Total Invested: $${mustafa.totalInvested}\n`);

    // Check investments
    const investments = await Investment.find({ userId: mustafa._id });
    console.log(`📊 INVESTMENTS: Found ${investments.length}`);
    
    investments.forEach(inv => {
      console.log(`   - $${inv.amount} | Status: ${inv.status} | Active: ${inv.isActive} | Daily: ${inv.dailyRate}%`);
      console.log(`     Total Profit Earned: $${inv.totalProfitEarned}`);
      console.log(`     Last Profit Date: ${inv.lastProfitDate}`);
    });

    // Check transactions
    const profitTransactions = await Transaction.find({ userId: mustafa._id, type: 'profit' }).sort({ date: -1 }).limit(10);
    console.log(`\n💰 RECENT PROFIT TRANSACTIONS: ${profitTransactions.length}`);
    
    profitTransactions.forEach(tx => {
      console.log(`   - $${tx.amount} | ${tx.date.toLocaleDateString()} | ${tx.description}`);
    });

    const commissionTransactions = await Transaction.find({ userId: mustafa._id, type: 'commission' }).sort({ date: -1 }).limit(5);
    console.log(`\n💵 RECENT COMMISSION TRANSACTIONS: ${commissionTransactions.length}`);
    
    commissionTransactions.forEach(tx => {
      console.log(`   - $${tx.amount} | ${tx.date.toLocaleDateString()} | ${tx.description}`);
    });

    console.log('\n🔍 DIAGNOSIS:');
    
    const activeInvestments = investments.filter(i => i.isActive && i.status === 'active');
    if (activeInvestments.length === 0) {
      console.log('   ❌ NO ACTIVE INVESTMENTS - Profit cannot be earned');
    } else {
      console.log(`   ✅ Has ${activeInvestments.length} active investments`);
      
      const totalProfit = activeInvestments.reduce((sum, inv) => sum + inv.totalProfitEarned, 0);
      if (totalProfit === 0) {
        console.log('   ⚠️  Investments exist but NO PROFIT EARNED YET');
        console.log('      → Check if cron job is running');
        console.log('      → Check investment lastProfitDate');
      } else {
        console.log(`   ✅ Profit is being earned: $${totalProfit.toFixed(2)}`);
        
        if (mustafa.wallet.profit === 0) {
          console.log('   ❌ BUT wallet.profit = 0 (database issue or sync problem)');
        } else {
          console.log(`   ✅ Wallet.profit shows: $${mustafa.wallet.profit}`);
        }
      }
    }

    if (mustafa.wallet.commission > 0) {
      console.log(`   ✅ Commission IS working: $${mustafa.wallet.commission}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
};

connectDB().then(() => diagnose());
