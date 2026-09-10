// GET /api/leads/mainSheet
// Returns every row in the Main Sheet tab. Readable by any logged-in user
// (not just admins) — admin-only restriction is on deleting, not viewing.

const { verifyIdToken } = require("../../lib/services");
const { getAllRows } = require("../../lib/sheetRows");

const MAIN_SHEET_TAB = "Main Sheet";

function rowToEntry(row) {
  return {
    business: row[0] || "",
    city: row[1] || "",
    type: row[2] || "",
    addedBy: row[3] || "",
    dateShared: row[4] || "",
    notes: row[5] || "",
    leadId: row[6] || "",
  };
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await verifyIdToken(req); // any logged-in user, no role check
  } catch (e) {
    return res.status(e.statusCode || 401).json({ error: e.message });
  }

  let rows;
  try {
    rows = await getAllRows(MAIN_SHEET_TAB, "G");
  } catch (e) {
    return res.status(200).json({ leads: [] });
  }

  return res.status(200).json({ leads: rows.map(rowToEntry) });
};
