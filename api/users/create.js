// POST /api/users/create
// Body: { name, email, password, role? }  (role defaults to "user")
// Admin-only. Creates a new Firebase Auth account plus its Firestore role doc.

const { verifyIdToken, getUserRole, getAuth, getFirestore } = require("../../lib/services");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let decoded;
  try {
    decoded = await verifyIdToken(req);
  } catch (e) {
    return res.status(e.statusCode || 401).json({ error: e.message });
  }

  const requesterRole = await getUserRole(decoded.uid);
  if (requesterRole !== "admin") {
    return res.status(403).json({ error: "Only admins can create new users" });
  }

  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "password must be at least 6 characters" });
  }
  const finalRole = role === "admin" ? "admin" : "user";

  let newUserRecord;
  try {
    newUserRecord = await getAuth().createUser({ email, password, displayName: name });
  } catch (e) {
    return res.status(400).json({ error: `Could not create user: ${e.message}` });
  }

  await getFirestore().collection("users").doc(newUserRecord.uid).set({
    name,
    role: finalRole,
  });

  return res.status(200).json({
    uid: newUserRecord.uid,
    email,
    name,
    role: finalRole,
  });
};
