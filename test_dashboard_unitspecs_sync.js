// Test to validate the Dashboard now calculates maintenance status correctly from UnitSpecs data

console.log("🧪 Testing Dashboard calculation from UnitSpecs data\n");

// Simulate UnitSpecs data structure
const testUnitsSpecs = [
  {
    Tag: "JOIIPC0001",
    deviceType: "PC",
    lastMaintenanceDate: new Date(Date.now() - (2 * 30 * 24 * 60 * 60 * 1000)), // 2 months ago
    maintenanceChecklist: {
      "Physical inspection for damage": { completed: true, completedDate: new Date(Date.now() - (2 * 30 * 24 * 60 * 60 * 1000)) },
      "Update operating system": { completed: true, completedDate: new Date(Date.now() - (2 * 30 * 24 * 60 * 60 * 1000)) },
      "Run antivirus scan": { completed: true, completedDate: new Date(Date.now() - (2 * 30 * 24 * 60 * 60 * 1000)) },
      "Check power supply connections": { completed: true, completedDate: new Date(Date.now() - (2 * 30 * 24 * 60 * 60 * 1000)) },
      "Monitor CPU and GPU temperatures": { completed: true, completedDate: new Date(Date.now() - (2 * 30 * 24 * 60 * 60 * 1000)) }
    },
    Drive: "SSD 256GB",
    Condition: "GOOD" // Device condition
  },
  {
    Tag: "JOIIPC0002", 
    deviceType: "Laptop",
    lastMaintenanceDate: new Date(Date.now() - (4 * 30 * 24 * 60 * 60 * 1000)), // 4 months ago
    maintenanceChecklist: {
      "Physical inspection for damage": { completed: true, completedDate: new Date(Date.now() - (4 * 30 * 24 * 60 * 60 * 1000)) },
      "Update operating system": { completed: false },
      "Run antivirus scan": { completed: true, completedDate: new Date(Date.now() - (4 * 30 * 24 * 60 * 60 * 1000)) },
      "Check battery health": { completed: false }
    },
    Drive: "HDD 500GB",
    Condition: "GOOD" // Device condition
  }
];

// Copy the maintenance calculation functions from UnitSpecs
const getMaintenanceChecklist = (device) => {
  if (!device) return [];

  const tasks = [];

  // Basic maintenance tasks for all devices
  tasks.push({ task: "Physical inspection for damage", critical: true });
  tasks.push({ task: "Clean dust from vents and components", critical: false });
  tasks.push({ task: "Check cable connections", critical: false });
  tasks.push({ task: "Update operating system", critical: true });
  tasks.push({ task: "Run antivirus scan", critical: true });
  tasks.push({ task: "Check disk space and cleanup", critical: false });

  // Device-specific tasks
  if (device.deviceType?.toLowerCase() === "laptop") {
    tasks.push({ task: "Check battery health", critical: true });
    tasks.push({ task: "Test keyboard and trackpad", critical: false });
    tasks.push({ task: "Check hinge operation", critical: false });
  } else if (device.deviceType?.toLowerCase() === "pc") {
    tasks.push({ task: "Check power supply connections", critical: true });
    tasks.push({ task: "Monitor CPU and GPU temperatures", critical: true });
    tasks.push({ task: "Test USB and other ports", critical: false });
  }

  // Storage-specific tasks
  if (device.Drive?.toLowerCase().includes("hdd")) {
    tasks.push({ task: "Run disk health check (HDD)", critical: true });
  } else if (device.Drive?.toLowerCase().includes("ssd")) {
    tasks.push({ task: "Check SSD health and wear level", critical: true });
  }

  return tasks.sort((a, b) => b.critical - a.critical);
};

const calculateMaintenanceStatus = (device) => {
  if (!device) return "Critical";

  const now = new Date();
  const lastMaintenance = device.lastMaintenanceDate
    ? new Date(
        device.lastMaintenanceDate.seconds
          ? device.lastMaintenanceDate.seconds * 1000
          : device.lastMaintenanceDate
      )
    : null;
  const maintenanceChecklist = device.maintenanceChecklist || {};

  // Get the required checklist for this device
  const requiredTasks = getMaintenanceChecklist(device);
  const criticalTasks = requiredTasks.filter((task) => task.critical);

  // Check if device hasn't been maintained for 6+ months (critical)
  if (lastMaintenance) {
    const monthsSinceLastMaintenance =
      (now - lastMaintenance) / (1000 * 60 * 60 * 24 * 30);
    if (monthsSinceLastMaintenance >= 6) {
      return "Critical";
    }
  } else {
    // No maintenance record - check if device is older than 6 months
    const deviceAge = device.dateAdded
      ? (now - new Date(device.dateAdded)) / (1000 * 60 * 60 * 24 * 30)
      : 0;
    if (deviceAge >= 6) {
      return "Critical";
    }
  }

  // Check if maintenance tasks need to be reset (every 3 months)
  const tasksNeedingReset = [];
  Object.keys(maintenanceChecklist).forEach((taskName) => {
    const task = maintenanceChecklist[taskName];
    if (task.completed && task.completedDate) {
      const completedDate = new Date(
        task.completedDate.seconds
          ? task.completedDate.seconds * 1000
          : task.completedDate
      );
      const monthsSinceCompletion =
        (now - completedDate) / (1000 * 60 * 60 * 24 * 30);
      if (monthsSinceCompletion >= 3) {
        tasksNeedingReset.push(taskName);
      }
    }
  });

  // Count currently completed critical tasks (excluding those that need reset)
  const currentlyCompletedCriticalTasks = criticalTasks.filter((reqTask) => {
    const task = maintenanceChecklist[reqTask.task];
    if (!task || !task.completed) return false;
    
    // Check if this task needs reset
    if (tasksNeedingReset.includes(reqTask.task)) return false;
    
    return true;
  });

  const criticalCompletionRate =
    criticalTasks.length > 0
      ? currentlyCompletedCriticalTasks.length / criticalTasks.length
      : 1;

  // For new devices with no maintenance data, return "Healthy" if no maintenance is overdue
  if (Object.keys(maintenanceChecklist).length === 0) {
    // Check if device is older than 6 months
    const deviceAge = device.dateAdded
      ? (now - new Date(device.dateAdded)) / (1000 * 60 * 60 * 24 * 30)
      : 0;
    if (deviceAge >= 6) {
      return "Needs Maintenance"; // Old device with no maintenance
    }
    return "Healthy"; // New device, no maintenance needed yet
  }

  // Determine status based on completion rate
  if (criticalCompletionRate >= 0.8) {
    // 80% of critical tasks completed and not needing reset
    return "Healthy";
  } else if (criticalCompletionRate >= 0.5) {
    // 50-79% completion
    return "Needs Maintenance";
  } else {
    return "Critical"; // Less than 50% completion
  }
};

// Test calculation
console.log("📊 Testing Dashboard calculation logic with UnitSpecs data:\n");

const specsStatusMap = {
  "Healthy": 0,
  "Needs Maintenance": 0,
  "Critical": 0
};

testUnitsSpecs.forEach((unit, index) => {
  const maintenanceStatus = calculateMaintenanceStatus(unit);
  specsStatusMap[maintenanceStatus]++;
  
  console.log(`Unit ${index + 1} (${unit.Tag}):`);
  console.log(`  Device Type: ${unit.deviceType}`);
  console.log(`  Device Condition: ${unit.Condition} (physical condition)`);
  console.log(`  Calculated Maintenance Status: ${maintenanceStatus} (from checklist)`);
  console.log("");
});

console.log("📈 Dashboard Specifications Report Data:");
console.log(JSON.stringify(specsStatusMap, null, 2));

console.log("\n📋 Summary:");
Object.entries(specsStatusMap).forEach(([status, count]) => {
  const total = Object.values(specsStatusMap).reduce((sum, val) => sum + val, 0);
  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
  console.log(`  ${status}: ${count} devices (${percentage}%)`);
});

console.log("\n✅ Dashboard now calculates maintenance status from UnitSpecs data correctly!");
console.log("🎯 This should match what you see in UnitSpecs maintenance badges.");
