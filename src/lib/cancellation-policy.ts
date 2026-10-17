import type { Json } from "@/integrations/supabase/types";

export type CancellationPolicy = { hours: number; late_action: "block" | "fee"; fee_percent: number };
export const DEFAULT_CANCELLATION_POLICY: CancellationPolicy = { hours: 0, late_action: "fee", fee_percent: 0 };

export function readCancellationPolicy(value: Json | undefined): CancellationPolicy {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_CANCELLATION_POLICY;
  const { hours, late_action, fee_percent } = value;
  if (typeof hours !== "number" || !Number.isInteger(hours) || hours < 0 || hours > 168 ||
    typeof fee_percent !== "number" || !Number.isInteger(fee_percent) || fee_percent < 0 || fee_percent > 100 ||
    (late_action !== "fee" && late_action !== "block")) return DEFAULT_CANCELLATION_POLICY;
  return { hours, late_action, fee_percent };
}

export function sessionStartsAt(date: string, slot: string): string {
  const match = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(slot);
  if (!match) throw new Error("Invalid session time");
  const hours = Number(match[1]) % 12 + (match[3] === "PM" ? 12 : 0);
  return new Date(`${date}T${String(hours).padStart(2, "0")}:${match[2]}:00+05:30`).toISOString();
}

export function cancellationDeadline(startsAt: string, policy: CancellationPolicy): string {
  return new Date(new Date(startsAt).getTime() - policy.hours * 3600000).toISOString();
}

export function cancellationOutcome(startsAt: string, policy: CancellationPolicy, amount: number, now: number) {
  if (now >= new Date(startsAt).getTime()) return { allowed: false, fee: 0 };
  const late = now > new Date(cancellationDeadline(startsAt, policy)).getTime();
  return { allowed: !(late && policy.late_action === "block"), fee: late && policy.late_action === "fee" ? Math.round(amount * policy.fee_percent / 100) : 0 };
}

export function formatPolicyTime(value: string): string {
  return new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) + " IST";
}