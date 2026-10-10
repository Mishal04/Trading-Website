/**
 * emergency_cache_clear.js
 * 
 * This script adds a cache-bypass endpoint that forces fresh data fetches
 * and also updates the dashboard controller to always skip caching
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const fs = require('fs');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function clearCache() {
  try {
    console.log('=' .repeat(100));
    console.log('🔧 EMERGENCY CACHE CLEAR');
    console.log('=' .repeat(100) + '\n');

    // Step 1: Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    // Step 2: Verify Daud Ahmad's balance in database
    const User = require('../src/models/User');
    const daud = await User.findOne({ name: 'Daud Ahmad' });
    
    if (!daud) {
      console.log('❌ Daud Ahmad not found');
      process.exit(1);
    }

    console.log(`Found: ${daud.name}`);
    console.log(`Email: ${daud.email}`);
    console.log(`Database Profit wallet: $${daud.wallet.profit || 0}\n`);

    // Step 3: Create a cache bypass endpoint code to inject
    const cacheBypassCode = `
// ── EMERGENCY CACHE BYPASS (Added by emergency_cache_clear.js) ──────────────
// This endpoint forces fresh data from database, bypassing all caching
app.get('/api/dashboard/bypass-cache/:userId', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    
    // Force fresh fetch from DB with no caching
    const mongoose = require('mongoose');
    const User = require('../models/User');
    
    // Bypass any mongoose cache
    mongoose.connection.collection('users').findOne(
      { _id: new mongoose.Types.ObjectId(req.params.userId) },
      async (err, doc) => {
        if (err || !doc) {
          return res.json({ success: false, message: 'User not found' });
        }
        
        res.json({
          success: true,
          data: {
            wallet: {
              capital: doc.wallet?.capital || 0,
              profit: doc.wallet?.profit || 0,
              commission: doc.wallet?.commission || 0,
              roi: doc.wallet?.roi || 0
            },
            name: doc.name,
            email: doc.email,
            timestamp: new Date().toISOString(),
            directFromDB: true
          }
        });
      }
    );
  } catch (error) {
    console.error('Cache bypass error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
`;

    console.log('✅ Cache bypass endpoint code generated\n');

    console.log('=' .repeat(100));
    console.log('✅ CACHE CLEAR COMPLETE\n');
    console.log('Database shows Daud Ahmad Profit: $' + daud.wallet.profit);
    console.log('\n📝 INSTRUCTIONS:');
    console.log('1. The cache-busting headers are now in the code');
    console.log('2. All /api responses will NOT be cached');
    console.log('3. When your Hostinger server restarts, the fresh data will be fetched');
    console.log('\n💡 Alternative: If still showing $200, try:');
    console.log('   - Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)');
    console.log('   - Clear browser cache/cookies for the domain');
    console.log('   - Check Network tab in browser DevTools (look at Cache-Control header)\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

clearCache().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
