// POST /api/leads/update
// Body: { leadId, status?, notes?, followUpDate?, priority? }
// Owner-only: uses the caller's own tab, derived from their verified email.

const { verifyIdToken, tabNameForUser } = require("../../lib/services");
const {
  findRowIndexByLeadId,
  getAllRows,
  updateRow,
} = require("../../lib/sheetRows");

const VALID_STATUSES = [
  "Not Called",
  "Called",
  "Interested",
  "Not Interested",
  "Follow-Up Later",
];

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

  const { leadId, status, notes, followUpDate, priority } = req.body || {};
  if (!leadId) {
    return res.status(400).json({ error: "leadId is required" });
  }
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
  }

  const tabName = tabNameForUser(decoded.email);
  const rowNumber = await findRowIndexByLeadId(tabName, leadId);
  if (!rowNumber) {
    return res.status(404).json({ error: "Lead not found in your leads" });
  }

  const rows = await getAllRows(tabName);
  const current = rows[rowNumber - 2]; // convert back to 0-indexed array position

  const updated = [...current];
  // indices per HEADERS: 7 Status, 8 Notes, 9 Follow-up Date, 10 Priority, 11 Call Count
  if (status !== undefined) {
    updated[7] = status;
    if (status === "Called") {
      const currentCount = parseInt(current[11] || "0", 10);
      updated[11] = String(currentCount + 1);
    }
  }
  if (notes !== undefined) updated[8] = notes;
  if (followUpDate !== undefined) updated[9] = followUpDate;
  if (priority !== undefined) updated[10] = priority ? "TRUE" : "FALSE";

  // pad to 14 columns in case the row was short
  while (updated.length < 14) updated.push("");

  await updateRow(tabName, rowNumber, updated);

  return res.status(200).json({ leadId, updated: true });
};
