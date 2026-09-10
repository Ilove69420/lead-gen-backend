// GET /api/leads/list
// Returns all leads in the caller's own tab, as parsed objects grouped
// implicitly by Batch ID (the frontend groups them into batch cards).

const { verifyIdToken, tabNameForUser } = require("../../lib/services");
const { getAllRows } = require("../../lib/sheetRows");

function rowToLead(row) {
  return {
    leadId: row[0] || "",
    batchId: row[1] || "",
    name: row[2] || "",
    address: row[3] || "",
    phone: row[4] || "",
    website: row[5] || "",
    type: row[6] || "",
    status: row[7] || "Not Called",
    notes: row[8] || "",
    followUpDate: row[9] || "",
    priority: row[10] === "TRUE",
    callCount: parseInt(row[11] || "0", 10),
    shared: row[12] === "TRUE",
    addedDate: row[13] || "",
  };
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let decoded;
  try {
    decoded = await verifyIdToken(req);
  } catch (e) {
    return res.status(e.statusCode || 401).json({ error: e.message });
  }

  const tabName = tabNameForUser(decoded.email);
  let rows;
  try {
    rows = await getAllRows(tabName, "N");
  } catch (e) {
    // Tab doesn't exist yet (no searches run) — just means an empty list.
    return res.status(200).json({ leads: [] });
  }

  return res.status(200).json({ leads: rows.map(rowToLead) });
};
