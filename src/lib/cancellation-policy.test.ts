import { describe, test } from "node:test";
import { deepStrictEqual, strictEqual } from "node:assert";
import { cancellationDeadline, cancellationOutcome, sessionStartsAt } from "./cancellation-policy";

describe("configurable cancellation rules", () => {
  const start = "2026-10-20T04:30:00.000Z";
  const policy = { hours: 24, late_action: "fee" as const, fee_percent: 25 };
  test("cutoff uses the selected hours and IST session time", () => {
    strictEqual(sessionStartsAt("2026-10-20", "10:00 AM"), start);
    strictEqual(cancellationDeadline(start, policy), "2026-10-19T04:30:00.000Z");
  });
  test("deadline itself is free; late fees use the booked amount", () => {
    deepStrictEqual(cancellationOutcome(start, policy, 399, Date.parse("2026-10-19T04:30:00Z")), { allowed: true, fee: 0 });
    deepStrictEqual(cancellationOutcome(start, policy, 399, Date.parse("2026-10-19T04:30:01Z")), { allowed: true, fee: 100 });
  });
  test("configured restriction blocks late cancellation", () => {
    deepStrictEqual(cancellationOutcome(start, { ...policy, late_action: "block" }, 399, Date.parse("2026-10-19T05:00:00Z")), { allowed: false, fee: 0 });
  });
  test("no cancellation at or after session start", () => {
    deepStrictEqual(cancellationOutcome(start, policy, 399, Date.parse(start)), { allowed: false, fee: 0 });
  });
  test("existing free cancellation stays free before start", () => {
    deepStrictEqual(cancellationOutcome(start, { hours: 0, late_action: "fee", fee_percent: 0 }, 399, Date.parse(start) - 1), { allowed: true, fee: 0 });
  });
});