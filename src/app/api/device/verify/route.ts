import { NextRequest, NextResponse } from "next/server";
import {
  assertDeviceSession,
  DEVICE_MISMATCH_MESSAGE,
  verifyIdToken,
  verifyOrRegisterDevice,
} from "@/lib/deviceService";
import { isAdminConfigured } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

type Body = {
  deviceId?: string;
  browser?: string;
  operatingSystem?: string;
  deviceType?: "Mobile" | "Desktop" | "Tablet";
  sessionVersion?: number | null;
  checkOnly?: boolean;
};

/**
 * POST /api/device/verify
 * Body: { deviceId, browser, operatingSystem, deviceType, sessionVersion?, checkOnly? }
 * Auth: Bearer Firebase ID token
 */
export async function POST(req: NextRequest) {
  try {
    if (!isAdminConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Device security Admin SDK is not configured. Client will use Firestore fallback.",
        },
        { status: 503 }
      );
    }

    const decoded = await verifyIdToken(req.headers.get("authorization"));
    if (!decoded) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = (await req.json()) as Body;
    const deviceId = (body.deviceId || "").trim();
    if (!deviceId) {
      return NextResponse.json(
        { ok: false, error: "deviceId is required." },
        { status: 400 }
      );
    }

    const meta = {
      browser: body.browser || "Unknown",
      operatingSystem: body.operatingSystem || "Unknown",
      deviceType: body.deviceType || ("Desktop" as const),
    };

    if (body.checkOnly) {
      const result = await assertDeviceSession(
        decoded.uid,
        deviceId,
        body.sessionVersion ?? null
      );
      if (!result.ok) {
        const status =
          result.code === "DEVICE_MISMATCH" || result.code === "BLOCKED"
            ? 403
            : 400;
        return NextResponse.json(result, { status });
      }
      return NextResponse.json(result);
    }

    const result = await verifyOrRegisterDevice(
      decoded.uid,
      deviceId,
      meta,
      body.sessionVersion ?? null
    );
    if (!result.ok) {
      const status =
        result.code === "DEVICE_MISMATCH" || result.code === "BLOCKED"
          ? 403
          : result.code === "INACTIVE"
            ? 403
            : 400;
      return NextResponse.json(
        {
          ...result,
          error:
            result.code === "DEVICE_MISMATCH"
              ? DEVICE_MISMATCH_MESSAGE
              : result.error,
        },
        { status }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Device verification failed.";
    console.error("[device/verify]", message);
    return NextResponse.json(
      {
        ok: false,
        error: message.includes("Admin")
          ? message
          : "Device verification failed. Please try again.",
      },
      { status: 500 }
    );
  }
}
