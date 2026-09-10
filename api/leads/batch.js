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

    rowsToInsert.push([
      leadId,
      batchId,
      lead.name || "",
      lead.address || "",
      lead.phone || "",
      lead.website || "",
      businessType,
      "Not Called",
      "",
      "",
      "FALSE",
      "0",
      "FALSE",
      addedDate,
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
