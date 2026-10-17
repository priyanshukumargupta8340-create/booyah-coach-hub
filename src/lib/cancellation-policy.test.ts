import { describe, expect, test } from "bun:test";
import { cancellationDeadline, cancellationOutcome, sessionStartsAt } from "./cancellation-policy";

describe("configurable cancellation rules", () => {
  const start = "2026-10-20T04:30:00.000Z";
  const policy = { hours: 24, late_action: "fee" as const, fee_percent: 25 };
  test("cutoff uses the selected hours and IST session time", () => {
    expect(sessionStartsAt("2026-10-20", "10:00 AM")).toBe(start);
    expect(cancellationDeadline(start, policy)).toBe("2026-10-19T04:30:00.000Z");
  });
  test("deadline itself is free; late fees use the booked amount", () => {
    expect(cancellationOutcome(start, policy, 399, Date.parse("2026-10-19T04:30:00Z"))).toEqual({ allowed: true, fee: 0 });
    expect(cancellationOutcome(start, policy, 399, Date.parse("2026-10-19T04:30:01Z"))).toEqual({ allowed: true, fee: 100 });
  });
  test("configured restriction blocks late cancellation", () => {
    expect(cancellationOutcome(start, { ...policy, late_action: "block" }, 399, Date.parse("2026-10-19T05:00:00Z"))).toEqual({ allowed: false, fee: 0 });
  });
  test("no cancellation at or after session start", () => {
    expect(cancellationOutcome(start, policy, 399, Date.parse(start))).toEqual({ allowed: false, fee: 0 });
  });
  test("existing free cancellation stays free before start", () => {
    expect(cancellationOutcome(start, { hours: 0, late_action: "fee", fee_percent: 0 }, 399, Date.parse(start) - 1)).toEqual({ allowed: true, fee: 0 });
  });
});