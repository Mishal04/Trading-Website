const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = require('./src/models/User');
  
  const hussain = await User.findOne({ name: { $regex: 'Muhammad.*Hussein|Muhammad.*Hussain', $options: 'i' } })
    .select('_id name createdAt email');
  
  if (hussain) {
    console.log(`Name: ${hussain.name}`);
    console.log(`ID: ${hussain._id}`);
    console.log(`Join Date: ${hussain.createdAt}`);
    console.log(`Email: ${hussain.email}`);
  } else {
    console.log('Not found');
  }
  
  process.exit(0);
})();
