"use client";

import { useEffect, useMemo, useState } from "react";
import { buildUpiPayUri, getSignupConfig, qrImageUrl } from "@/lib/signup";
import { SignupPaymentConfig } from "@/lib/types";

export function PaymentPanel({ userId }: { userId: string }) {
  const [config, setConfig] = useState<SignupPaymentConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getSignupConfig()
      .then((next) => {
        if (!cancelled) setConfig(next);
      })
      .catch(() => {
        if (!cancelled) setConfig(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const upiUri = useMemo(
    () => (config ? buildUpiPayUri(config, userId) : null),
    [config, userId]
  );

  return (
    <div className="mt-4 rounded-[var(--radius-control)] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
      <p className="font-medium text-text">Pay to use this ID again</p>
      <p className="mt-1 leading-relaxed text-text-secondary">
        User ID <strong className="text-text">{userId}</strong> is deactivated.
        Complete payment, then ask the administrator to activate it. After
        activation you can use the software for 1 month.
      </p>

      {upiUri ? (
        <div className="mt-4 flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrImageUrl(upiUri, 220)}
            alt="UPI payment QR code"
            width={220}
            height={220}
            className="rounded-xl border border-border bg-white p-2"
          />
          <p className="mt-3 text-center text-sm font-medium text-text">
            Scan to pay
            {config?.amount ? ` ₹${config.amount}` : ""}
          </p>
          {config?.upiId && (
            <p className="mt-1 text-center text-xs text-muted">
              UPI: {config.upiId}
              {config.payeeName ? ` · ${config.payeeName}` : ""}
            </p>
          )}
          <a
            href={upiUri}
            className="mt-3 text-sm font-medium text-primary hover:underline"
          >
            Open UPI app
          </a>
        </div>
      ) : (
        <p className="mt-3 leading-relaxed text-text-secondary">
          Pay your administrator using the details they shared. Login works
          again only after they activate this ID.
        </p>
      )}
    </div>
  );
}
