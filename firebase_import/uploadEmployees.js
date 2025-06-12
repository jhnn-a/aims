// uploadEmployees.js

const fs = require("fs");
const xlsx = require("xlsx");
const admin = require("firebase-admin");
const path = require("path");

// Load service account
const serviceAccount = require("./serviceAccountKey.json");

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Check if Excel file exists
const excelPath = path.join(__dirname, "employees.xlsx");

if (!fs.existsSync(excelPath)) {
  console.error("❌ Excel file not found at:", excelPath);
  process.exit(1);
}

// Load Excel file
const workbook = xlsx.readFile(excelPath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });

// Debug output
console.log(`📄 Total rows read: ${data.length}`);
console.log("📌 Sample rows:", data.slice(0, 3));

// Helper to convert "Last, First" → "First Last"
function formatName(rawName) {
  const parts = rawName.split(",");
  if (parts.length === 2) {
    const last = parts[0].trim();
    const first = parts[1].trim();
    return `${first} ${last}`;
  }
  return rawName;
}

async function uploadData() {
  for (const entry of data) {
    const docId = entry.id;
    const fullName = formatName(entry.firstName);
    const position = entry.position || "";
    const client = entry.client || "";

    if (!docId || !fullName) {
      console.warn("⚠️ Skipping invalid entry:", entry);
      continue;
    }

    await db.collection("employees").doc(docId).set({
      fullName,
      position,
      client,
    });

    console.log(`✅ Uploaded ${docId} - ${fullName}`);
  }

  console.log("🎉 All employees uploaded.");
}

uploadData().catch((err) => {
  console.error("❌ Upload failed:", err);
});
