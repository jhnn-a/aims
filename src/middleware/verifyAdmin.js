const admin = require("firebase-admin");

module.exports = async function verifyAdmin(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const token = header.split(" ")[1];
    const decoded = await admin.auth().verifyIdToken(token);

    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Admins only" });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};
