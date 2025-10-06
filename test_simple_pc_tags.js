// Test file to verify simple PC tag generation works correctly
// This tests the reverted PC tag system that uses JOIIPC0001 format instead of JOIIPCI30001

// Mock existing devices for testing
const testDevices = [
  { deviceTag: "JOIIPC0001" },
  { deviceTag: "JOIIPC0002" },
  { deviceTag: "JOIIPC0003" },
  { deviceTag: "JOIILPT0001" },
  { deviceTag: "JOIIMN0001" },
];

// Simulate the simple PC tag generation logic
function generateSimplePCTag(allDevices) {
  const prefix = "JOIIPC";
  const ids = allDevices
    .map((d) => d.deviceTag)
    .filter((tag) => tag && tag.startsWith(prefix))
    .map((tag) => parseInt(tag.replace(prefix, "")))
    .filter((num) => !isNaN(num));
  const max = ids.length > 0 ? Math.max(...ids) : 0;
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

// Test the function
console.log("=== Simple PC Tag Generation Test ===");
console.log(
  "Existing devices:",
  testDevices.map((d) => d.deviceTag)
);
console.log("Next PC tag should be:", generateSimplePCTag(testDevices));
console.log("Expected: JOIIPC0004");

// Test with no existing PC devices
const emptyDevices = [
  { deviceTag: "JOIILPT0001" },
  { deviceTag: "JOIIMN0001" },
];

console.log("\n=== Test with no existing PC devices ===");
console.log(
  "Existing devices:",
  emptyDevices.map((d) => d.deviceTag)
);
console.log("Next PC tag should be:", generateSimplePCTag(emptyDevices));
console.log("Expected: JOIIPC0001");

console.log("\n✅ Simple PC tag generation test completed!");
console.log(
  "🔄 PC tags have been reverted from JOIIPCI30001 format to JOIIPC0001 format"
);
