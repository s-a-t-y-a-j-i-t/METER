import { NextRequest, NextResponse } from "next/server";
import {
  blockUserDevice,
  forceLogoutUser,
  removeUserDevice,
  requireAdminFromToken,
  resetUserDevice,
} from "@/lib/deviceService";
import { isAdminConfigured } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

type Action = "reset" | "remove" | "force-logout" | "block";

/**
 * POST /api/admin/devices/[userId]
 * Body: { action: "reset" | "remove" | "force-logout" | "block" }
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
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

    const { userId } = await context.params;
    const id = (userId || "").trim().toLowerCase();
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "User ID is required." },
        { status: 400 }
      );
    }

    const body = (await req.json()) as { action?: Action };
    const action = body.action;
    if (!action) {
      return NextResponse.json(
        { ok: false, error: "action is required." },
        { status: 400 }
      );
    }

    let result: { ok: boolean; error?: string };
    switch (action) {
      case "reset":
        result = await resetUserDevice(id);
        break;
      case "remove":
        result = await removeUserDevice(id);
        break;
      case "force-logout":
        result = await forceLogoutUser(id);
        break;
      case "block":
        result = await blockUserDevice(id);
        break;
      default:
        return NextResponse.json(
          { ok: false, error: "Unknown action." },
          { status: 400 }
        );
    }

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Device action failed.";
    console.error("[admin/devices/:userId]", message);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
