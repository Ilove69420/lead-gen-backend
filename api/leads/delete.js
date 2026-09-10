// POST /api/leads/delete
// Body: { leadId?, target: "own" | "mainSheet", clearAll?: boolean }
//
// target "own": deletes leadId from the caller's own tab. Always allowed
//   for the caller's own leads, regardless of shared status. Never touches
//   the Main Sheet copy.
// target "mainSheet": deletes leadId from the Main Sheet tab, OR if
//   clearAll is true, wipes every row. Admin-only in both cases.

const { verifyIdToken, tabNameForUser, getUserRole } = require("../../lib/services");
const {
  findRowIndexByLeadId,
  deleteRow,
  clearAllRows,
} = require("../../lib/sheetRows");

const MAIN_SHEET_TAB = "Main Sheet";

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

  const { leadId, target, clearAll } = req.body || {};
  if (target !== "own" && target !== "mainSheet") {
    return res.status(400).json({ error: 'target must be "own" or "mainSheet"' });
  }

  if (target === "own") {
    if (!leadId) return res.status(400).json({ error: "leadId is required" });
    const tabName = tabNameForUser(decoded.email);
    const rowNumber = await findRowIndexByLeadId(tabName, leadId);
    if (!rowNumber) {
      return res.status(404).json({ error: "Lead not found in your leads" });
    }
    await deleteRow(tabName, rowNumber);
    return res.status(200).json({ leadId, deletedFrom: "own" });
  }

  // target === "mainSheet" — admin only
  const role = await getUserRole(decoded.uid);
  if (role !== "admin") {
    return res.status(403).json({ error: "Only admins can delete from the Main Sheet" });
  }

  if (clearAll) {
    await clearAllRows(MAIN_SHEET_TAB);
    return res.status(200).json({ clearedMainSheet: true });
  }

  if (!leadId) {
    return res.status(400).json({ error: "leadId is required unless clearAll is true" });
  }
  const rowNumber = await findRowIndexByLeadId(MAIN_SHEET_TAB, leadId, 6, "G");
  if (!rowNumber) {
    return res.status(404).json({ error: "Lead not found in Main Sheet" });
  }
  await deleteRow(MAIN_SHEET_TAB, rowNumber);
  return res.status(200).json({ leadId, deletedFrom: "mainSheet" });
};
