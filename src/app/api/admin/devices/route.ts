import { NextRequest, NextResponse } from "next/server";
import { listUsersWithDevices, requireAdminFromToken } from "@/lib/deviceService";
import { isAdminConfigured } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

/** GET /api/admin/devices — list all users with device binding info (admin only). */
export async function GET(req: NextRequest) {
  try {
    if (!isAdminConfigured()) {
      return NextResponse.json(
        { ok: false, error: "Admin SDK not configured." },
        { status: 503 }
      );
    }
    const auth = await requireAdminFromToken(req.headers.get("authorization"));
    if (!auth.ok) {
      return NextResponse.json(
        { ok: false, error: auth.error },
        { status: 403 }
      );
    }

    const devices = await listUsersWithDevices();
    return NextResponse.json({ ok: true, devices });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load devices.";
    console.error("[admin/devices]", message);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
