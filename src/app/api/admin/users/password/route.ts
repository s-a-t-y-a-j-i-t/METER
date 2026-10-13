import { NextRequest, NextResponse } from "next/server";
import { requireAdminFromToken, setUserPassword } from "@/lib/deviceService";
import { isAdminConfigured } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

/**
 * POST /api/admin/users/password
 * Body: { userId, password }
 * Auth: Bearer Firebase ID token for an active admin.
 */
export async function POST(req: NextRequest) {
  try {
    if (!isAdminConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Password changes need Firebase Admin credentials on the server (FIREBASE_SERVICE_ACCOUNT_JSON). Sign-in emails are not real inboxes, so a reset email cannot be delivered.",
        },
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

    const body = (await req.json()) as { userId?: string; password?: string };
    const result = await setUserPassword(body.userId || "", body.password || "");
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to set password.";
    console.error("[admin/users/password]", message);
    return NextResponse.json(
      { ok: false, error: "Unable to set this password." },
      { status: 500 }
    );
  }
}
