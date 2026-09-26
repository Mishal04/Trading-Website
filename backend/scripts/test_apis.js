const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const User = require("../src/models/User");

async function testAPIs() {
  try {
    console.log("\n" + "=".repeat(80));
    console.log("API ENDPOINT TESTING");
    console.log("=".repeat(80));

    // Connect to MongoDB to get admin token setup info
    await mongoose.connect(process.env.MONGODB_URI);

    // Find admin for token generation
    const admin = await User.findOne({ accountType: "admin" });
    if (!admin) {
      console.log("No admin found to generate token");
      await mongoose.connection.close();
      return;
    }

    console.log("\nAdmin found:", admin.email);

    // Check if server is running
    const serverUrl = "http://localhost:5000";
    try {
      await axios.get(serverUrl);
      console.log("Server is running at", serverUrl);
    } catch (err) {
      console.log("Server not running at", serverUrl);
      console.log("Please start the server first with: npm run dev");
      await mongoose.connection.close();
      return;
    }

  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await mongoose.connection.close();
  }
}

testAPIs();
