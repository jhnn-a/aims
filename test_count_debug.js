// Test to debug why Dashboard shows 3 Critical instead of 1 Critical + 1 Needs Maintenance

console.log("🔍 Debugging Dashboard vs UnitSpecs Count Mismatch\n");

console.log("🎯 Expected from UnitSpecs: 1 Critical + 1 Needs Maintenance = 2 total devices");
console.log("❌ Dashboard showing: 3 Critical + 0 Needs Maintenance + 0 Healthy = 3 total devices");

console.log("\n🤔 Possible Issues:");
console.log("1. Dashboard is counting more devices than UnitSpecs tracks");
console.log("2. UnitSpecs only shows devices with maintenance data");
console.log("3. Dashboard might be including devices without maintenance tracking");
console.log("4. Fallback logic is too aggressive (defaulting everything to Critical)");

console.log("\n🔧 Solution Applied:");
console.log("- Filter devices to only count those with Tag + deviceType (actual UnitSpecs devices)");
console.log("- Default devices without maintenance data to 'Healthy' instead of age-based logic");
console.log("- Only calculate for devices that would actually appear in UnitSpecs");

console.log("\n📊 Expected Results After Fix:");

// Simulate the corrected logic
const testDevices = [
  {
    Tag: "JOIIPC0001",
    deviceType: "PC",
    maintenanceChecklist: {
      "Physical inspection for damage": { completed: true, completedDate: new Date() },
      "Update operating system": { completed: true, completedDate: new Date() },
      "Run antivirus scan": { completed: true, completedDate: new Date() },
      "Check power supply connections": { completed: true, completedDate: new Date() },
      "Monitor CPU and GPU temperatures": { completed: false } // 80% completion = Healthy
    }
  },
  {
    Tag: "JOIIPC0002", 
    deviceType: "Laptop",
    maintenanceChecklist: {
      "Physical inspection for damage": { completed: false },
      "Update operating system": { completed: false },
      "Run antivirus scan": { completed: false },
      "Check battery health": { completed: false } // 0% completion = Critical
    }
  }
];

console.log("\nSimulated UnitSpecs devices:");
testDevices.forEach((device, index) => {
  const checklistKeys = Object.keys(device.maintenanceChecklist || {});
  const completedTasks = checklistKeys.filter(key => device.maintenanceChecklist[key].completed);
  const completionRate = checklistKeys.length > 0 ? (completedTasks.length / checklistKeys.length) * 100 : 0;
  
  let status;
  if (completionRate >= 80) {
    status = "Healthy";
  } else if (completionRate >= 50) {
    status = "Needs Maintenance"; 
  } else {
    status = "Critical";
  }
  
  console.log(`${index + 1}. ${device.Tag}:`);
  console.log(`   - Maintenance tasks: ${completedTasks.length}/${checklistKeys.length} completed (${completionRate.toFixed(1)}%)`);
  console.log(`   - Status: ${status}`);
});

console.log("\n✅ If Dashboard shows same as this simulation, it's working correctly!");
console.log("📋 Check browser console for actual device data being processed by Dashboard.");

console.log("\n🎯 Next Steps:");
console.log("1. Open Dashboard and check browser console logs");
console.log("2. Compare logged device count with UnitSpecs device count");
console.log("3. Verify only devices with Tag + deviceType are being counted");
console.log("4. Check that maintenance status calculation matches UnitSpecs badges");
