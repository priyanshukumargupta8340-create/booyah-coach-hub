import { cancellationDeadline, formatPolicyTime, type CancellationPolicy } from "@/lib/cancellation-policy";

export function CancellationPolicyNotice({ policy, startsAt, amount }: { policy: CancellationPolicy; startsAt?: string | null; amount: number }) {
  const fee = Math.round(amount * policy.fee_percent / 100);
  return (
    <section aria-label="Cancellation policy" className="mt-4 border-t border-border pt-3 text-sm">
      <h4 className="font-semibold text-gold">Cancellation policy</h4>
      <p className="mt-1 text-muted-foreground">
        {startsAt ? `Free cancellation until ${formatPolicyTime(cancellationDeadline(startsAt, policy))}.` : `Free cancellation up to ${policy.hours} hours before your session.`}
      </p>
      <p className="mt-1 text-muted-foreground">
        {policy.late_action === "block" ? "After the deadline, player cancellations are not allowed. Contact your coach." : `After the deadline: ${policy.fee_percent}% cancellation fee (₹${fee}).`}
        {" "}No cancellation once the session starts. Session times are in IST.
      </p>
      {policy.late_action === "fee" && policy.fee_percent > 0 && <p className="mt-1 text-xs text-muted-foreground">Fees are recorded only. Payments are simulated; no money is charged or refunded.</p>}
    </section>
  );
}