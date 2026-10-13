import { AppUser } from "./types";

/** How long an approved user ID stays usable before admin is asked to deactivate it. */
export const ACCESS_PERIOD_MONTHS = 1;

export function addCalendarMonths(from: Date, months: number): Date {
  const d = new Date(from.getTime());
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

export function accessWindowFrom(start: Date): {
  activatedAt: string;
  accessExpiresAt: string;
} {
  return {
    activatedAt: start.toISOString(),
    accessExpiresAt: addCalendarMonths(start, ACCESS_PERIOD_MONTHS).toISOString(),
  };
}

/** Active non-admin IDs whose 1-month approval window has ended. */
export function isAccessDue(
  user: Pick<AppUser, "role" | "status" | "accessExpiresAt">
): boolean {
  if (user.role === "admin" || user.status !== "active") return false;
  if (!user.accessExpiresAt) return false;
  const ends = new Date(user.accessExpiresAt).getTime();
  return !Number.isNaN(ends) && ends <= Date.now();
}
