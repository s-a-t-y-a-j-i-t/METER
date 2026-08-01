# Security & Architecture Notes

## Summary

MeterVision is a **frontend-only** Next.js application.

There is:

- No API server
- No Firebase / Supabase / database
- No server-side session authority

Authentication and application state live in the browser (`localStorage` / `sessionStorage`).

## Implications

- User IDs and passwords are stored in browser storage for local demo convenience.
- Role checks in the UI reduce accidental navigation mistakes but **cannot** stop a determined user who edits storage.
- “Remember me” uses `localStorage`; unchecking it stores the session in `sessionStorage` for the current tab only.
- Clearing site data logs everyone out and may remove local users/history until re-seeded.

## Suitable for

- Prototypes
- Demos
- Internal offline / single-browser workflows
- Non-sensitive meter image editing practice

## Not suitable for

- Public multi-user production SaaS
- Regulated or confidential meter data without a backend
- Compliance-grade access control

## Production path (out of scope for this repo)

Replace local auth with a real identity provider, move authorization to the server, and store users/history/activity in a secured backend.
