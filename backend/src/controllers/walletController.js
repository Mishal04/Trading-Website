// backend/src/controllers/walletController.js

const { validationResult } = require('express-validator');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');

/**
 * Resolve a user by email, username or referralCode.
 * Accepts a string identifier and attempts to match in that order.
 */
async function resolveRecipient(to) {
  // try email exact match
  let user = await User.findOne({ email: to });
  if (user) return user;
  // try username field (assuming name is used as username)
  user = await User.findOne({ name: to });
  if (user) return user;
  // try referral code
  user = await User.findOne({ referralCode: to });
  return user;
}

/**
 * POST /api/wallet/transfer
 * Body: { to: string, amount: number, note?: string }
 * Transfers USDT from sender's wallet.profit to recipient's wallet.profit.
 */
const transferFunds = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  const { to, amount, note } = req.body;
  const senderId = req.user._id;

  if (amount <= 0) {
    return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
  }

  const sender = await User.findById(senderId);
  if (!sender) {
    return res.status(404).json({ success: false, message: 'Sender not found' });
  }

  if (sender.wallet.profit < amount) {
    return res.status(400).json({ success: false, message: `Insufficient balance. Available profit: $${sender.wallet.profit}` });
  }

  const recipient = await resolveRecipient(to);
  if (!recipient) {
    return res.status(404).json({ success: false, message: 'Recipient not found' });
  }

  // Perform atomic updates using session to ensure consistency
  const session = await User.startSession();
  session.startTransaction();
  try {
    await User.findByIdAndUpdate(senderId, { $inc: { 'wallet.profit': -amount } }, { session });
    await User.findByIdAndUpdate(recipient._id, { $inc: { 'wallet.profit': amount } }, { session });

    // Create transaction logs
    const now = new Date();
    await Transaction.create([
      {
        userId: senderId,
        type: 'P2P_OUT',
        amount,
        status: 'completed',
        description: `P2P transfer to ${recipient.email || recipient.name || recipient.referralCode}`,
        referenceId: recipient._id,
        referenceModel: 'User',
        metadata: { note: note || '' },
        date: now
      },
      {
        userId: recipient._id,
        type: 'P2P_IN',
        amount,
        status: 'completed',
        description: `P2P transfer from ${sender.email || sender.name}`,
        referenceId: senderId,
        referenceModel: 'User',
        metadata: { note: note || '' },
        date: now
      }
    ], { session });

    // Notify both parties
    await Notification.create({
      userId: senderId,
      title: 'P2P Transfer Sent',
      message: `You sent $${amount} to ${recipient.email || recipient.name}.`,
      type: 'info'
    }, { session });

    await Notification.create({
      userId: recipient._id,
      title: 'P2P Transfer Received',
      message: `You received $${amount} from ${sender.email || sender.name}.`,
      type: 'info'
    }, { session });

    await session.commitTransaction();
    session.endSession();

    return res.json({ success: true, message: 'Transfer completed', data: { amount, to: recipient._id } });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('P2P transfer error:', err);
    return res.status(500).json({ success: false, message: 'Server error during transfer' });
  }
};

/**
 * GET /api/wallet/transfers
 * Returns list of P2P_IN and P2P_OUT transactions for the logged‑in user.
 */
const listTransfers = async (req, res) => {
  const userId = req.user._id;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const query = { userId, type: { $in: ['P2P_IN', 'P2P_OUT'] } };

  const [total, transfers] = await Promise.all([
    Transaction.countDocuments(query),
    Transaction.find(query).sort({ date: -1 }).skip(skip).limit(limit)
  ]);

  return res.json({
    success: true,
    data: {
      transfers,
      pagination: { total, page, pages: Math.ceil(total / limit), limit }
    }
  });
};

module.exports = { transferFunds, listTransfers };
