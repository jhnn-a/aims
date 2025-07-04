// setAdminClaim.js
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // Adjust path if needed

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const email = "johnmungcal2@gmail.com"; // <-- Replace with your admin email

admin
  .auth()
  .getUserByEmail(email)
  .then((user) => {
    return admin.auth().setCustomUserClaims(user.uid, { role: "admin" });
  })
  .then(() => {
    console.log(`Custom claim 'admin' set for ${email}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error setting custom claim:", error);
    process.exit(1);
  });
