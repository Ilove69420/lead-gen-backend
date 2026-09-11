// POST /api/leads/batch
// Called by the local companion script after it finishes a Google Maps search.
// Body: { city: string, businessType: string, leads: [{ name, address, phone, website }] }

const { v4: uuidv4 } = require("uuid");
const { verifyIdToken, tabNameForUser } = require("../../lib/services");
const {
  ensureTabExists,
  getAllRows,
  appendRows,
} = require("../../lib/sheetRows");

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

  const { city, businessType, leads } = req.body || {};
  if (!city || !businessType || !Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({
      error: "Body must include city, businessType, and a non-empty leads array",
    });
  }

  const tabName = tabNameForUser(decoded.email);
  await ensureTabExists(tabName);

  const existingRows = await getAllRows(tabName);
  const existingKeys = new Set(
    existingRows.map((r) => `${(r[2] || "").toLowerCase()}|${(r[3] || "").toLowerCase()}`)
  );

  const batchId = `${city}-${businessType}-${new Date().toISOString().slice(0, 10)}`;
  const addedDate = new Date().toISOString();

  const rowsToInsert = [];
  const results = [];

  for (const lead of leads) {
    const key = `${(lead.name || "").toLowerCase()}|${(lead.address || "").toLowerCase()}`;
    const isDuplicate = existingKeys.has(key);
    const leadId = uuidv4();

    // FIX: this column classifies the lead by whether it has a website —
    // that's the entire point of "Type" (No Website / Has Website), not
    // the business category (that's preserved in the Batch ID instead).
    const websiteType = lead.website ? "Has Website" : "No Website";

    rowsToInsert.push([
      leadId,                       // A: Lead ID
      batchId,                      // B: Batch ID
      lead.name || "",              // C: Business
      lead.address || "",           // D: Address
      lead.phone || "",             // E: Phone
      lead.website || "",           // F: Website
      city,                         // G: City (stored directly — no more parsing from Batch ID)
      websiteType,                  // H: Type — FIXED
      "Not Called",                 // I: Status
      "",                           // J: Notes
      "",                           // K: Follow-up Date
      "FALSE",                      // L: Priority
      "0",                          // M: Call Count
      "FALSE",                      // N: Shared
      addedDate,                    // O: Added Date
      isDuplicate ? "TRUE" : "FALSE", // P: Possible Duplicate — now persisted, not just returned once
    ]);

    results.push({
      leadId,
      name: lead.name,
      possibleDuplicate: isDuplicate,
    });

    existingKeys.add(key); // avoid flagging dupes within the same batch twice
  }

  await appendRows(tabName, rowsToInsert);

  return res.status(200).json({
    batchId,
    inserted: rowsToInsert.length,
    leads: results,
  });
};
