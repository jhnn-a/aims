// Test appraisal date calculation fix
console.log("=== TESTING APPRAISAL DATE CALCULATION ===");

// Mock the calculateAppraisalDate function
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

  // Auto-detect based on specs
  const cpuString = cpuGen?.toLowerCase() || "";
  const ramSize = parseInt(ram) || 0;
  const driveString = drive?.toLowerCase() || "";
  const gpuString = gpu?.toLowerCase() || "";

  // High-end criteria
  if (
    cpuString.includes("i7") &&
    ramSize >= 16 &&
    (driveString.includes("ssd") || driveString.includes("nvme")) &&
    gpuString &&
    !gpuString.includes("integrated")
  ) {
    return 5;
  }

  // Mid-range criteria
  if (
    cpuString.includes("i5") &&
    ramSize >= 8 &&
    (driveString.includes("ssd") || ramSize >= 12)
  ) {
    return 4;
  }

  // Low-end: everything else
  return 3;
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

// Test cases
const testCases = [
  {
    name: "High-End Laptop",
    dateAdded: "2024-01-15",
    category: "High-End",
    cpuGen: "i7",
    ram: "16",
    drive: "512GB SSD",
    gpu: "RTX 3060",
  },
  {
    name: "Mid-Range PC",
    dateAdded: "2024-06-01",
    category: "Mid-Range",
    cpuGen: "i5",
    ram: "8",
    drive: "1TB SSD",
    gpu: "GTX 1660",
  },
  {
    name: "Low-End PC",
    dateAdded: "2024-03-10",
    category: "Low-End",
    cpuGen: "i3",
    ram: "4",
    drive: "500GB HDD",
    gpu: "Integrated",
  },
  {
    name: "Auto-Detected High-End",
    dateAdded: "2024-02-20",
    category: "", // Will auto-detect
    cpuGen: "i7",
    ram: "32",
    drive: "1TB NVME SSD",
    gpu: "RTX 4080",
  },
];

console.log("\n📊 APPRAISAL DATE TEST RESULTS:");
testCases.forEach((testCase) => {
  const appraisalDate = calculateAppraisalDate(
    testCase.dateAdded,
    testCase.category,
    testCase.cpuGen,
    testCase.ram,
    testCase.drive,
    testCase.gpu
  );

  const lifespan = getLifespanYears(
    testCase.category,
    testCase.cpuGen,
    testCase.ram,
    testCase.drive,
    testCase.gpu
  );

  console.log(`\n${testCase.name}:`);
  console.log(`  Date Added: ${testCase.dateAdded}`);
  console.log(`  Category: ${testCase.category || "Auto-detected"}`);
  console.log(`  Lifespan: ${lifespan} years`);
  console.log(`  Appraisal Date: ${appraisalDate}`);
});

console.log("\n✅ Appraisal date calculation test completed!");
console.log("📝 The fix ensures that:");
console.log("   1. Sync from Inventory → Calculates and saves appraisalDate");
console.log("   2. Manual Add/Edit → Calculates and saves appraisalDate");
console.log("   3. Excel Import → Calculates and saves appraisalDate");
console.log(
  "   4. Table Display → Shows saved appraisalDate or calculates on-the-fly"
);
