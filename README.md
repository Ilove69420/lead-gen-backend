# Lead-Gen Backend (Vercel Serverless Functions)

## What's here
```
backend/
  api/
    leads/
      batch.js    -> POST /api/leads/batch    (companion script sends new leads here)
      update.js   -> POST /api/leads/update    (status/notes/follow-up/priority)
      share.js    -> POST /api/leads/share     (copy a lead to Main Sheet)
      delete.js   -> POST /api/leads/delete    (own tab: anyone; Main Sheet: admin only)
    users/
      create.js   -> POST /api/users/create    (admin-only, creates a new login)
  lib/
    services.js   -> Firebase Admin + Google Sheets setup, token verification
    sheetRows.js  -> low-level row read/write/delete helpers
  package.json
  .env.example
```

## One manual Sheet change required
Your Main Sheet tab currently has 6 columns (Business, City, Type, Added By,
Date Shared, Notes). Add a 7th header in **cell G1: `Lead ID`** — this is how
admin deletes find the right row. It can stay hidden/unused visually; it's
just there for the backend to reference.

## Environment variables (set these in Vercel, never in code or chat)
See `.env.example` for the names. You'll need:
- `SHEETS_SERVICE_ACCOUNT_JSON` — full JSON key for the Sheets service account, minified to one line
- `FIREBASE_ADMIN_KEY_JSON` — full JSON key for the Firebase Admin SDK, minified to one line
- `SHEET_ID` — already known: `1GntkCr0FePHI1AwdzR7KRQc_NMbtE_8HS4JQHkzeVRw`

To turn a downloaded JSON key file into one line, you can use this command
locally (never uploaded anywhere): `node -e "console.log(JSON.stringify(require('./yourfile.json')))"`

## How auth works on every endpoint
The frontend / companion script sends the user's Firebase ID token as:
`Authorization: Bearer <token>`
Each function verifies it server-side with `firebase-admin`, then (for
admin-only routes) checks the caller's role in Firestore before doing anything.

## Not done yet (next steps)
- Companion script (Node.js + Playwright) that calls `/api/leads/batch`
- Frontend that calls all five endpoints
- Deploying this folder to Vercel + wiring up env vars there
