// Test PC CPU-specific tag generation
const deviceTypes = [
  { label: "PC", code: "PC" },
  { label: "RAM", code: "RAM" },
  { label: "Laptop", code: "LPT" },
  // ... other types
];

const testDevices = [
  { deviceTag: "JOIIPCI30001" },
  { deviceTag: "JOIIPCI30002" },
  { deviceTag: "JOIIPCI50001" },
  { deviceTag: "JOIIRAM40001" },
  { deviceTag: "JOIILPT0001" },
];

// Test function to extract CPU System Unit for PC devices
function extractCpuSystemUnit(deviceTag, deviceType) {
  if (deviceType === "PC" && deviceTag) {
    const pcMatch = deviceTag.match(/^JOIIPC(I[3579])/);
    if (pcMatch) {
      const cpuType = pcMatch[1];
      const cpuMap = {
        I3: "i3",
        I5: "i5",
        I7: "i7",
        I9: "i9",
      };
      return cpuMap[cpuType] || "";
    }
  }
  return "";
}

// Test function to generate CPU-specific PC tag
function generateCpuSpecificPCTag(cpuSystemUnit, allDevices) {
  if (cpuSystemUnit) {
    const cpuMap = {
      i3: "I3",
      i5: "I5",
      i7: "I7",
      i9: "I9",
    };
    const cpuCode = cpuMap[cpuSystemUnit];
    if (cpuCode) {
      const prefix = `JOIIPC${cpuCode}`;
      const ids = allDevices
        .map((d) => d.deviceTag)
        .filter((tag) => tag && tag.startsWith(prefix))
        .map((tag) => parseInt(tag.replace(prefix, "")))
        .filter((num) => !isNaN(num));
      const max = ids.length > 0 ? Math.max(...ids) : 0;
      return `${prefix}${String(max + 1).padStart(4, "0")}`;
    }
  }
  return "";
}

// Test extractions
console.log("Testing PC CPU extraction:");
console.log("JOIIPCI30001 ->", extractCpuSystemUnit("JOIIPCI30001", "PC")); // Should be "i3"
console.log("JOIIPCI50001 ->", extractCpuSystemUnit("JOIIPCI50001", "PC")); // Should be "i5"

// Test generation
console.log("\nTesting PC CPU tag generation:");
console.log("i3 ->", generateCpuSpecificPCTag("i3", testDevices)); // Should be "JOIIPCI30003"
console.log("i5 ->", generateCpuSpecificPCTag("i5", testDevices)); // Should be "JOIIPCI50002"
console.log("i7 ->", generateCpuSpecificPCTag("i7", testDevices)); // Should be "JOIIPCI70001"
console.log("i9 ->", generateCpuSpecificPCTag("i9", testDevices)); // Should be "JOIIPCI90001"
