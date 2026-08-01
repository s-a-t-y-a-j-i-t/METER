# MeterVision — Meter Reading Editor

Frontend-only web application for uploading meter images, detecting readings with OCR (Tesseract.js), editing overlays on canvas, adjusting image look, and downloading PNG/JPG results.

## Stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS
- HTML5 Canvas
- Tesseract.js (client-side OCR)
- Lucide React
- Browser `localStorage` / `sessionStorage` (no backend)

## Features

- Frontend-only authentication (admin & user roles)
- Admin dashboard with live local statistics
- User management (create, edit, activate/deactivate, reset password)
- Activity logs
- User dashboard & processing history
- Meter image upload (JPG / JPEG / PNG / WEBP, max 10 MB)
- OCR with manual reading override
- Overlay editor (position, style, zoom)
- Brightness / contrast / temperature adjustments
- Final preview + PNG/JPG export at original resolution
- Profile & settings
- Light / Dark / System theme
- Responsive layout (mobile drawer, touch-friendly controls)

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production build

```bash
npm run build
npm start
```

## Default admin

On first load (empty storage), a recoverable system admin is seeded locally:

- User ID: `admin`
- Password: set during first local seed (see in-app recovery / your local storage)

Change the admin password after first login in a shared demo environment.

## Important limitation — not production-secure auth

This application is **frontend-only**.

Authentication, users, activity logs, history, and settings are stored in **browser storage**.

This architecture is suitable for **prototypes, demos, and internal non-sensitive usage**.

Production deployment with real user accounts requires a **secure backend authentication system** and **server-side authorization**.

Anyone with access to the browser DevTools can read or modify local data. Do not store sensitive credentials or treat this as multi-tenant security.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Serve production build |
| `npm run lint` | ESLint |

## Project structure (high level)

```text
src/app/           App Router pages
src/components/    UI (auth, layout, meter, users, common)
src/context/       Auth, theme, toast providers
src/lib/           storage, types, utils, branding
```

## License

Private / internal use unless otherwise specified.
