const mongoose = require('mongoose');
const Transaction = require('./src/models/Transaction');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Find Najum Malik's ID
    const User = require('./src/models/User');
    const najum = await User.findOne({ name: 'Najum Malik' });
    if (!najum) {
      console.log('Najum not found');
      process.exit(1);
    }
    
    console.log('NAJUM MALIK TRANSACTIONS (TODAY):');
    console.log('--------------------------------------------');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const trans = await Transaction.find({
      userId: najum._id,
      createdAt: { $gte: today }
    }).sort({ createdAt: -1 });
    
    console.log(Total transactions: \n);
    
    let totalComm = 0;
    let totalProfit = 0;
    
    trans.forEach(t => {
      console.log(${t.type.toUpperCase().padEnd(12)} +Allow L1 commissions for users with 0 directs - fix unlock level enforcement{t.amount.toFixed(2).padEnd(8)} | );
      if (t.type === 'commission') totalComm += t.amount;
      if (t.type === 'profit') totalProfit += t.amount;
    });
    
    console.log(\nSummary:);
    console.log(  Total Profit: Allow L1 commissions for users with 0 directs - fix unlock level enforcement{totalProfit.toFixed(2)});
    console.log(  Total Commission: Allow L1 commissions for users with 0 directs - fix unlock level enforcement{totalComm.toFixed(2)});
    
    // Also check his downline
    console.log(\n\nNAJUM'S DOWNLINE AND THEIR ROI:);
    console.log('--------------------------------------------');
    
    const downline = await User.find({ ancestorPath: { $in: [najum._id] } });
    
    for (const member of downline) {
      const memberTrans = await Transaction.find({
        userId: member._id,
        type: 'profit',
        createdAt: { $gte: today }
      });
      
      const totalROI = memberTrans.reduce((s, t) => s + t.amount, 0);
      if (totalROI > 0) {
        console.log(${member.name.padEnd(30)} | ROI: Allow L1 commissions for users with 0 directs - fix unlock level enforcement{totalROI.toFixed(2)});
      }
    }
    
    mongoose.connection.close();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
