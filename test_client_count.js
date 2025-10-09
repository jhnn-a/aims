// Test script to debug client asset counting
const admin = require("firebase-admin");
const serviceAccount = require("./firebase_import/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function testClientCounts() {
  console.log("Fetching all devices...");
  const devicesSnapshot = await db.collection("devices").get();
  const devices = devicesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  console.log(`Total devices in collection: ${devices.length}`);

  // Count devices for "Joii Philippines" with different matching strategies
  const exactMatch = devices.filter(
    (d) => d.client === "Joii Philippines"
  ).length;
  const caseInsensitiveMatch = devices.filter((d) => {
    if (!d.client) return false;
    return d.client.trim().toLowerCase() === "joii philippines";
  }).length;

  console.log(`\nExact match for "Joii Philippines": ${exactMatch}`);
  console.log(
    `Case-insensitive match for "Joii Philippines": ${caseInsensitiveMatch}`
  );

  // Count assigned vs unassigned
  const assigned = devices.filter(
    (d) => d.assignedTo && d.assignedTo.trim() !== ""
  ).length;
  const unassigned = devices.filter(
    (d) => !d.assignedTo || d.assignedTo.trim() === ""
  ).length;

  console.log(`\nAssigned devices (Deployed Assets): ${assigned}`);
  console.log(`Unassigned devices (Stockroom Assets): ${unassigned}`);

  // Get unique client values to see all variations
  const clientValues = new Set();
  const joiiVariations = new Set();

  devices.forEach((d) => {
    if (d.client) {
      clientValues.add(d.client);
      const normalized = d.client.trim().toLowerCase();
      if (normalized.includes("joii")) {
        joiiVariations.add(d.client);
      }
    }
  });

  console.log(`\nUnique client values count: ${clientValues.size}`);
  console.log("\nAll variations of 'Joii' in client field:");
  joiiVariations.forEach((v) => console.log(`  - "${v}"`));

  // Count devices by client (case-insensitive)
  const clientCounts = {};
  devices.forEach((d) => {
    if (d.client && d.client.trim() !== "") {
      const normalized = d.client.trim().toLowerCase();
      clientCounts[normalized] = (clientCounts[normalized] || 0) + 1;
    }
  });

  console.log("\nTop 5 clients by device count (case-insensitive):");
  const sortedClients = Object.entries(clientCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  sortedClients.forEach(([client, count]) => {
    console.log(`  - ${client}: ${count} devices`);
  });

  // Check for devices with assignedTo but for Joii Philippines
  const joiiAssigned = devices.filter((d) => {
    if (!d.client) return false;
    const normalized = d.client.trim().toLowerCase();
    return (
      normalized === "joii philippines" &&
      d.assignedTo &&
      d.assignedTo.trim() !== ""
    );
  }).length;

  const joiiUnassigned = devices.filter((d) => {
    if (!d.client) return false;
    const normalized = d.client.trim().toLowerCase();
    return (
      normalized === "joii philippines" &&
      (!d.assignedTo || d.assignedTo.trim() === "")
    );
  }).length;

  console.log(`\nJoii Philippines breakdown:`);
  console.log(`  - Deployed assets: ${joiiAssigned}`);
  console.log(`  - Stockroom assets: ${joiiUnassigned}`);
  console.log(`  - Total: ${joiiAssigned + joiiUnassigned}`);

  process.exit(0);
}

testClientCounts().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
