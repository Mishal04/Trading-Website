const bcrypt = require("bcryptjs");
const User = require("./src/models/User");
const mongoose = require("mongoose");
require("dotenv").config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const user = await User.findOne({ email: "sania@gmail.com" }).select("+password");
    
    console.log("Stored password hash:", user.password);
    console.log("\nTesting comparePassword method:");
    
    // Test 1: Can we compare the hash with itself?
    const hashCompare = await bcrypt.compare(user.password, user.password);
    console.log("Does hash === hash?", hashCompare);
    
    // Test 2: What if we try empty password?
    const emptyCompare = await user.comparePassword("");
    console.log("Empty password?", emptyCompare);
    
    await mongoose.disconnect();
  } catch (e) {
    console.error("Error:", e.message);
  }
})();
