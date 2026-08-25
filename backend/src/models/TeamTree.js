const mongoose = require('mongoose');

const teamTreeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  ancestors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  directCount: {
    type: Number,
    default: 0
  },
  totalTeamCount: {
    type: Number,
    default: 0
  },
  totalVolume: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

const TeamTree = mongoose.model('TeamTree', teamTreeSchema);
module.exports = TeamTree;
