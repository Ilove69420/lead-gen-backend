// POST /api/leads/share
// Body: { leadId }
// Copies the caller's own lead into the "Main Sheet" tab, and marks it
// Shared = TRUE in the caller's own tab. Does NOT remove it from My Leads.

const { verifyIdToken, tabNameForUser } = require("../../lib/services");
const {
  findRowIndexByLeadId,
  getAllRows,
  updateRow,
  appendRows,
  ensureTabExists,
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

  const { leadId } = req.body || {};
  if (!leadId) {
    return res.status(400).json({ error: "leadId is required" });
  }

  const tabName = tabNameForUser(decoded.email);
  const rowNumber = await findRowIndexByLeadId(tabName, leadId);
  if (!rowNumber) {
    return res.status(404).json({ error: "Lead not found in your leads" });
  }

  const rows = await getAllRows(tabName);
  const leadRow = rows[rowNumber - 2];

  // Main Sheet columns (per original roadmap): Business, City, Type, Added By, Date Shared, Notes
  // We pull City out of the Batch ID prefix, since that's where it's encoded.
  const batchId = leadRow[1] || "";
  const city = batchId.split("-")[0] || "";

  await ensureTabExists(MAIN_SHEET_TAB); // safe no-op if it already exists
  await appendRows(MAIN_SHEET_TAB, [[
    leadRow[2] || "",           // Business
    city,                        // City
    leadRow[6] || "",           // Type
    decoded.email,               // Added By
    new Date().toISOString(),    // Date Shared
    leadRow[8] || "",            // Notes
    leadId,                      // Lead ID (hidden helper column, for admin delete)
  ]]);

  // mark Shared = TRUE in the owner's own tab (column M / index 12)
  const updated = [...leadRow];
  while (updated.length < 14) updated.push("");
  updated[12] = "TRUE";
  await updateRow(tabName, rowNumber, updated);

  return res.status(200).json({ leadId, sharedToMainSheet: true });
};
