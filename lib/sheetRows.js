// lib/sheetRows.js
// Row-level helpers for reading/writing leads in Google Sheets.
//
// Column layout for a per-user tab (row 1 = headers):
// A: Lead ID | B: Batch ID | C: Business | D: Address | E: Phone | F: Website
// G: City | H: Type | I: Status | J: Notes | K: Follow-up Date | L: Priority
// M: Call Count | N: Shared (TRUE/FALSE) | O: Added Date | P: Possible Duplicate

const { getSheets, getSheetId } = require("./services");

const HEADERS = [
  "Lead ID", "Batch ID", "Business", "Address", "Phone", "Website",
  "City", "Type", "Status", "Notes", "Follow-up Date", "Priority",
  "Call Count", "Shared", "Added Date", "Possible Duplicate",
];

async function ensureTabExists(tabName) {
  const sheets = await getSheets();
  const spreadsheetId = getSheetId();

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = meta.data.sheets.some(
    (s) => s.properties.title === tabName
  );
  if (exists) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: tabName } } }],
    },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [HEADERS] },
  });
}

// lastColumn: "P" for per-user tabs (16 cols), "G" for Main Sheet (7 cols).
async function getAllRows(tabName, lastColumn = "P") {
  const sheets = await getSheets();
  const spreadsheetId = getSheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabName}!A2:${lastColumn}`,
  });
  return res.data.values || [];
}

async function appendRows(tabName, rows) {
  const sheets = await getSheets();
  const spreadsheetId = getSheetId();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A2`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });
}

// Finds the 1-indexed sheet row number for a given Lead ID, or null.
// idColumnIndex: 0 for per-user tabs (Lead ID is column A),
//                6 for Main Sheet (Lead ID is column G).
// lastColumn must cover at least idColumnIndex — pass it through so the
// fetch range matches the tab's actual width.
async function findRowIndexByLeadId(tabName, leadId, idColumnIndex = 0, lastColumn = "P") {
  const rows = await getAllRows(tabName, lastColumn);
  const idx = rows.findIndex((r) => r[idColumnIndex] === leadId);
  return idx === -1 ? null : idx + 2; // +2: header row + 0-index offset
}

async function updateRow(tabName, rowNumber, values) {
  const sheets = await getSheets();
  const spreadsheetId = getSheetId();
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!A${rowNumber}:P${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [values] },
  });
}

async function deleteRow(tabName, rowNumber) {
  const sheets = await getSheets();
  const spreadsheetId = getSheetId();
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = meta.data.sheets.find((s) => s.properties.title === tabName);
  if (!sheet) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: "ROWS",
              startIndex: rowNumber - 1,
              endIndex: rowNumber,
            },
          },
        },
      ],
    },
  });
}

async function clearAllRows(tabName) {
  const sheets = await getSheets();
  const spreadsheetId = getSheetId();
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${tabName}!A2:P`,
  });
}

module.exports = {
  HEADERS,
  ensureTabExists,
  getAllRows,
  appendRows,
  findRowIndexByLeadId,
  updateRow,
  deleteRow,
  clearAllRows,
};
