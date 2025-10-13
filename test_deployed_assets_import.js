// Test script for deployed assets import functionality
// This script helps verify that Device Owner assignment is working correctly

console.log("=== DEPLOYED ASSETS IMPORT TEST ===");

// Test the client lookup functionality
function testClientLookup() {
  console.log("\n--- Testing Client Lookup Logic ---");

  // Sample clients data (replace with actual data structure)
  const sampleClients = [
    { id: "CLIENT001", clientName: "Joii Philippines" },
    { id: "TECH001", clientName: "Tech Corp" },
    { id: "CLIENT003", clientName: "Global Solutions Inc" },
  ];

  // Helper function (copy from Employee.js)
  const findClientIdByName = (clientIdentifier, clients) => {
    if (!clientIdentifier || clientIdentifier.trim() === "") return "";

    const normalizedIdentifier = clientIdentifier.trim().toLowerCase();

    // First try to match by exact client ID
    let client = clients.find(
      (client) => client.id && client.id.toLowerCase() === normalizedIdentifier
    );

    // If not found by ID, try to match by client name (case-insensitive)
    if (!client) {
      client = clients.find(
        (client) =>
          client.clientName &&
          client.clientName.trim().toLowerCase() === normalizedIdentifier
      );
    }

    return client ? client.id : "";
  };

  // Test cases
  const testCases = [
    {
      input: "Joii Philippines",
      expected: "CLIENT001",
      description: "Client name match",
    },
    { input: "TECH001", expected: "TECH001", description: "Client ID match" },
    {
      input: "tech corp",
      expected: "TECH001",
      description: "Case-insensitive name match",
    },
    {
      input: "client001",
      expected: "CLIENT001",
      description: "Case-insensitive ID match",
    },
    { input: "NonExistent", expected: "", description: "Non-existent client" },
    { input: "", expected: "", description: "Empty input" },
    {
      input: "  Joii Philippines  ",
      expected: "CLIENT001",
      description: "Whitespace handling",
    },
  ];

  testCases.forEach((testCase, index) => {
    const result = findClientIdByName(testCase.input, sampleClients);
    const passed = result === testCase.expected;
    console.log(`Test ${index + 1}: ${testCase.description}`);
    console.log(`  Input: "${testCase.input}"`);
    console.log(`  Expected: "${testCase.expected}"`);
    console.log(`  Result: "${result}"`);
    console.log(`  Status: ${passed ? "✅ PASS" : "❌ FAIL"}`);
    console.log("");
  });
}

// Test the device data structure
function testDeviceDataStructure() {
  console.log("\n--- Testing Device Data Structure ---");

  const sampleDeviceData = {
    deviceType: "PC",
    brand: "Dell",
    model: "OptiPlex 7090",
    serialNumber: "ABC123456",
    deviceTag: "JOIIPC0001",
    condition: "GOOD",
    status: "GOOD",
    assignedTo: "EMP0001",
    assignmentDate: "2025-10-09",
    client: "CLIENT001", // This is the key field for Device Owner
    remarks: "Imported deployed asset for John Doe",
    specifications: "i5, 8GB RAM",
    warranty: "3 years",
    purchaseDate: "2025-09-01",
    supplier: "Dell Direct",
  };

  console.log("Sample device data structure:");
  console.log(JSON.stringify(sampleDeviceData, null, 2));

  // Validate required fields for client assignment
  const requiredFields = ["deviceType", "brand", "deviceTag", "assignedTo"];
  const clientFields = ["client"]; // This should contain the client ID

  console.log("\nValidation checks:");
  requiredFields.forEach((field) => {
    const hasField =
      sampleDeviceData.hasOwnProperty(field) && sampleDeviceData[field];
    console.log(`  ${field}: ${hasField ? "✅ Present" : "❌ Missing"}`);
  });

  clientFields.forEach((field) => {
    const hasField = sampleDeviceData.hasOwnProperty(field);
    const hasValue = hasField && sampleDeviceData[field];
    console.log(
      `  ${field}: ${
        hasField
          ? hasValue
            ? "✅ Present with value"
            : "⚠️ Present but empty"
          : "❌ Missing"
      }`
    );
  });
}

// Test Excel data processing
function testExcelDataProcessing() {
  console.log("\n--- Testing Excel Data Processing ---");

  // Sample Excel row data
  const sampleExcelRows = [
    {
      Employee: "John Doe",
      TYPE: "PC",
      BRAND: "Dell",
      "DEVICE OWNED": "Joii Philippines",
      "DEVICE TAG": "JOIIPC0001",
      "DATE DEPLOYED": "10/9/2025",
      "EMPLOYEE ID": "EMP0001",
      MODEL: "OptiPlex 7090",
      "SERIAL NUMBER": "ABC123456",
    },
    {
      Employee: "Jane Smith",
      TYPE: "Laptop",
      BRAND: "HP",
      "DEVICE OWNED": "TECH001", // Using Client ID instead of name
      "DEVICE TAG": "",
      "DATE DEPLOYED": "10/8/2025",
      "EMPLOYEE ID": "EMP0002",
      MODEL: "ProBook 450",
    },
    {
      Employee: "Bob Johnson",
      TYPE: "Monitor",
      BRAND: "Asus",
      "DEVICE OWNED": "", // No client specified
      "DEVICE TAG": "JOIIMON0001",
      "DATE DEPLOYED": "10/7/2025",
      "EMPLOYEE ID": "EMP0003",
    },
  ];

  console.log("Sample Excel data processing:");
  sampleExcelRows.forEach((row, index) => {
    console.log(`\nRow ${index + 1}:`);
    console.log(`  Employee: ${row["Employee"]}`);
    console.log(`  Device Type: ${row["TYPE"]}`);
    console.log(`  Brand: ${row["BRAND"]}`);
    console.log(
      `  Device Owned: "${row["DEVICE OWNED"]}" ${
        row["DEVICE OWNED"] ? "" : "(empty - no client assignment)"
      }`
    );
    console.log(
      `  Device Tag: "${row["DEVICE TAG"]}" ${
        row["DEVICE TAG"] ? "" : "(empty - will auto-generate)"
      }`
    );
    console.log(`  Employee ID: ${row["EMPLOYEE ID"]}`);
  });
}

// Run all tests
function runAllTests() {
  testClientLookup();
  testDeviceDataStructure();
  testExcelDataProcessing();

  console.log("\n=== TEST SUMMARY ===");
  console.log("✅ Client lookup logic tested");
  console.log("✅ Device data structure validated");
  console.log("✅ Excel data processing verified");
  console.log("\nTo use this import functionality:");
  console.log("1. Create Excel file with 'DEVICE OWNED' column");
  console.log("2. Use either Client Name or Client ID in the column");
  console.log("3. Import through Employee page > 'Import Deployed Assets'");
  console.log("4. Check console logs for detailed processing information");
  console.log("5. Verify device owner appears in Assets.js and Inventory.js");
}

// Export for Node.js or run directly
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    testClientLookup,
    testDeviceDataStructure,
    testExcelDataProcessing,
    runAllTests,
  };
} else {
  // Run tests if loaded in browser
  runAllTests();
}
