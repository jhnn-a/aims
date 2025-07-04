const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(require("./serviceAccountKey.json")),
});

app.post("/api/create-user", async (req, res) => {
  const { email, password, role } = req.body;
  // TODO: Authenticate the admin making this request (for production)
  try {
    const userRecord = await admin.auth().createUser({ email, password });
    await admin.auth().setCustomUserClaims(userRecord.uid, { role });
    res.json({ success: true, uid: userRecord.uid });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/delete-user", async (req, res) => {
  const { uid } = req.body;
  console.log("[DEBUG] /api/delete-user called for:", uid); // Debug log
  try {
    await admin.auth().deleteUser(uid);
    res.json({ success: true });
  } catch (err) {
    console.error("[ERROR] Failed to delete user:", err);
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/list-users", async (req, res) => {
  try {
    const listUsersResult = await admin.auth().listUsers();
    // Map users to only include relevant fields
    const users = listUsersResult.users.map((userRecord) => ({
      uid: userRecord.uid,
      email: userRecord.email,
      role: userRecord.customClaims?.role || "viewer",
    }));
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/update-user-role", async (req, res) => {
  const { uid, role } = req.body;
  console.log("[DEBUG] /api/update-user-role called with:", { uid, role });
  if (!uid || !role) {
    console.error("[ERROR] Missing uid or role in request body");
    return res.status(400).json({ error: "Missing uid or role." });
  }
  try {
    await admin.auth().setCustomUserClaims(uid, { role });
    console.log("[DEBUG] setCustomUserClaims success for:", uid, role);
    res.json({ success: true });
  } catch (err) {
    console.error("[ERROR] Failed to update user role:", err);
    res.status(400).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Admin API running on port ${PORT}`));
