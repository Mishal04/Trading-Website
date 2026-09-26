const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../src/models/User");
const InvestorInvestment = require("../src/models/InvestorInvestment");

async function runVerification() {
  try {
    console.log("\n" + "=".repeat(80));
    console.log("SANIA MIGRATION VERIFICATION");
    console.log("=".repeat(80));

    console.log("\nConnecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB\n");

    // TEST 1: Find sania@gmail.com User
    console.log("TEST 1: Query sania@gmail.com User document");
    console.log("-".repeat(80));
    const saniaUser = await User.findOne({ email: "sania@gmail.com" });
    
    if (saniaUser) {
      console.log("User sania@gmail.com FOUND");
      console.log("User ID:", saniaUser._id);
      console.log("Name:", saniaUser.name);
      console.log("Email:", saniaUser.email);
      console.log("Plan:", saniaUser.plan);
      console.log("Wallet - Capital:", saniaUser.wallet.capital);
      console.log("Wallet - Profit:", saniaUser.wallet.profit);
      console.log("Wallet - Commission:", saniaUser.wallet.commission);
      console.log("Wallet - ROI:", saniaUser.wallet.roi);
      console.log("Total Invested:", saniaUser.totalInvested);
      console.log("Total ROI Earned:", saniaUser.totalRoiEarned);
      console.log("Networker Access Granted:", saniaUser.networkerAccessGranted);
    } else {
      console.log("User sania@gmail.com NOT FOUND");
    }

    // TEST 2: Simulate GET /api/admin/investors
    console.log("\nTEST 2: Simulate GET /api/admin/investors endpoint");
    console.log("-".repeat(80));
    const query = {
      "$or": [
        { name: { "$regex": "sania", "$options": "i" } },
        { email: { "$regex": "sania@gmail.com", "$options": "i" } }
      ]
    };
    const investorsList = await User.find(query).select("-password");
    console.log("Query returned", investorsList.length, "result(s)");
    investorsList.forEach((inv, i) => {
      console.log("Result " + (i+1) + ": ID=" + inv._id + ", Email=" + inv.email + ", Plan=" + inv.plan);
    });

    // TEST 3: Simulate PATCH plan update
    console.log("\nTEST 3: Simulate PATCH /api/admin/investors/:id/plan");
    console.log("-".repeat(80));
    if (saniaUser) {
      console.log("Current plan:", saniaUser.plan);
      const newPlan = saniaUser.plan === "A" ? "B" : "A";
      const updateResult = await User.findByIdAndUpdate(
        saniaUser._id,
        { plan: newPlan },
        { new: true }
      ).select("-password");
      
      if (updateResult && updateResult.plan === newPlan) {
        console.log("Plan updated successfully to:", updateResult.plan);
        await User.findByIdAndUpdate(saniaUser._id, { plan: saniaUser.plan });
        console.log("Reverted plan back to:", saniaUser.plan);
      }
    }

    // TEST 4: Check for orphaned InvestorInvestment records
    console.log("\nTEST 4: Check for orphaned InvestorInvestment records");
    console.log("-".repeat(80));
    const oldInvestorId = "6aa667945a6d64407a4df189";
    const orphanedInvestments = await InvestorInvestment.find({
      investorId: oldInvestorId
    });
    
    console.log("Old Investor ID:", oldInvestorId);
    console.log("Orphaned records:", orphanedInvestments.length);
    
    if (orphanedInvestments.length === 0) {
      console.log("NO ORPHANED RECORDS - Migration complete");
    } else {
      console.log("ORPHANED RECORDS FOUND:", orphanedInvestments.length);
    }

    if (saniaUser) {
      const saniaInvestments = await InvestorInvestment.find({ userId: saniaUser._id });
      console.log("Investments for sania (userId):", saniaInvestments.length);
    }

    console.log("\n" + "=".repeat(80));
    console.log("VERIFICATION COMPLETE");
    console.log("=".repeat(80));

  } catch (error) {
    console.error("Verification error:", error.message);
  } finally {
    await mongoose.connection.close();
  }
}

runVerification();
