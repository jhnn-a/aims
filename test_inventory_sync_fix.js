// Test Inventory to UnitSpecs sync with appraisal date
console.log("=== TESTING INVENTORY TO UNITSPECS SYNC WITH APPRAISAL DATE ===");

// Mock the sync function logic
const extractCpuGen = (cpuString) => {
  if (!cpuString) return "";
  const match = cpuString.match(/(i[357])/i);
  return match ? match[1].toLowerCase() : "";
};

const extractRamSize = (ramString) => {
  if (!ramString) return "";
  const match = ramString.match(/(\d+)/);
  return match ? match[1] : "";
};

const calculateAppraisalDate = (
  dateAdded,
  category,
  cpuGen,
  ram,
  drive,
  gpu
) => {
  if (!dateAdded) return "";

  try {
    const addedDate = new Date(dateAdded);
    if (isNaN(addedDate.getTime())) return "";

    const getLifespanYears = (category, cpuGen, ram, drive, gpu) => {
      if (category) {
        switch (category) {
          case "Low-End":
            return 3;
          case "Mid-Range":
            return 4;
          case "High-End":
            return 5;
          default:
            return 3;
        }
      }

      const cpuString = cpuGen?.toLowerCase() || "";
      const ramSize = parseInt(ram) || 0;
      const driveString = drive?.toLowerCase() || "";
      const gpuString = gpu?.toLowerCase() || "";

      if (
        cpuString.includes("i7") &&
        ramSize >= 16 &&
        (driveString.includes("ssd") || driveString.includes("nvme")) &&
        gpuString &&
        !gpuString.includes("integrated")
      ) {
        return 5;
      }

      if (
        cpuString.includes("i5") &&
        ramSize >= 8 &&
        (driveString.includes("ssd") || ramSize >= 12)
      ) {
        return 4;
      }

      return 3;
    };

    const lifespanYears = getLifespanYears(category, cpuGen, ram, drive, gpu);
    const appraisalDate = new Date(addedDate);
    appraisalDate.setFullYear(appraisalDate.getFullYear() + lifespanYears);

    return appraisalDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch (error) {
    console.error("Error calculating appraisal date:", error);
    return "";
  }
};

// Test devices that would be added from Inventory
const testDevices = [
  {
    deviceTag: "JOIIPC001",
    deviceType: "PC",
    acquisitionDate: "2024-08-22",
    cpu: "Intel i7-12700K",
    ram: "16GB DDR4",
    drive1: "1TB NVMe SSD",
    gpu: "RTX 3070",
    condition: "BRANDNEW",
    category: "High-End",
  },
  {
    deviceTag: "JOIILP002",
    deviceType: "Laptop",
    acquisitionDate: "2024-07-15",
    cpu: "Intel i5-11400H",
    ram: "8GB DDR4",
    drive1: "512GB SSD",
    gpu: "GTX 1650",
    condition: "GOOD",
    category: "Mid-Range",
  },
  {
    deviceTag: "JOIIPC003",
    deviceType: "PC",
    acquisitionDate: "2024-06-01",
    cpu: "Intel i3-10100",
    ram: "4GB DDR4",
    drive1: "500GB HDD",
    gpu: "Integrated Graphics",
    condition: "GOOD",
    category: "",
  },
];

console.log("\n📊 INVENTORY SYNC SIMULATION:");

testDevices.forEach((device) => {
  const cpuGen = extractCpuGen(device.cpu);
  const ram = extractRamSize(device.ram);
  const dateAdded = device.acquisitionDate || new Date().toISOString();

  const appraisalDate = calculateAppraisalDate(
    dateAdded,
    device.category,
    cpuGen,
    ram,
    device.drive1,
    device.gpu
  );

  console.log(`\n${device.deviceTag} (${device.deviceType}):`);
  console.log(`  Acquisition Date: ${device.acquisitionDate}`);
  console.log(`  CPU: ${device.cpu} (Gen: ${cpuGen})`);
  console.log(`  RAM: ${device.ram} (Size: ${ram}GB)`);
  console.log(`  Drive: ${device.drive1}`);
  console.log(`  GPU: ${device.gpu}`);
  console.log(`  Category: ${device.category || "Auto-detected"}`);
  console.log(`  ✅ Appraisal Date: ${appraisalDate}`);
});

console.log("\n🎯 EXPECTED BEHAVIOR:");
console.log("✅ When you add a PC/Laptop in Inventory.js:");
console.log("   1. Device is saved to main devices collection");
console.log("   2. syncToUnitSpecs() automatically runs");
console.log("   3. Appraisal date is calculated based on specs");
console.log("   4. Device appears in UnitSpecs with appraisal date");
console.log('   5. No more "No Date" in Appraisal column!');

console.log("\n📝 TO TEST:");
console.log("1. Open Inventory.js in browser");
console.log("2. Add a new PC or Laptop");
console.log("3. Check UnitSpecs → Inventory Units");
console.log("4. Verify appraisal date appears correctly");
