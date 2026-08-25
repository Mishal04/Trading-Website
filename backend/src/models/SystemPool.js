const mongoose = require('mongoose');

const systemPoolSchema = new mongoose.Schema({
  salaryPool: {
    type: Number,
    default: 0
  },
  rewardPool: {
    type: Number,
    default: 0
  },
  levelPool: {
    type: Number,
    default: 0
  },
  investorPool: {
    type: Number,
    default: 0
  },
  traderSharePool: {
    type: Number,
    default: 0
  },
  totalRealizedProfit: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

/**
  Singleton helper to fetch or initialize the system pool document
 */
systemPoolSchema.statics.getSingleton = async function() {
  let pool = await this.findOne();
  if (!pool) {
    pool = await this.create({
      salaryPool: 0,
      rewardPool: 0,
      levelPool: 0,
      investorPool: 0,
      traderSharePool: 0,
      totalRealizedProfit: 0
    });
  }
  return pool;
};

const SystemPool = mongoose.model('SystemPool', systemPoolSchema);
module.exports = SystemPool;
