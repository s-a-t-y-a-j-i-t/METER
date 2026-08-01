# MeterEdit — Meter Reading Editor

Frontend-only web application for uploading meter images, detecting readings with OCR (Tesseract.js), editing overlays on canvas, and downloading the final image.

## Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- HTML5 Canvas
- Tesseract.js (client-side OCR)
- Lucide React
- localStorage (no backend)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Default Admin

On first load, a default admin is created in localStorage:

- Username: `admin`
- Password: `admin123`

> **Security notice:** This app uses browser-only localStorage authentication. It is for prototype/demo/internal offline use and is **not** suitable for secure production authentication.

## Features

- Admin & user dashboards
- User management (create, edit, activate/deactivate, reset password)
- Meter image upload (JPG/PNG/WEBP, max 10 MB)
- Browser OCR with editable readings
- Canvas overlay editor (position, font, color, background)
- PNG/JPG download
- Processing history (metadata only)
- Fully responsive mobile layouts
