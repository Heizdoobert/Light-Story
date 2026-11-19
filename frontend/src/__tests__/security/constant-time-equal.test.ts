import { describe, expect, it } from "vitest";
import { constantTimeEqual } from "@/lib/security/route-auth";

describe("constantTimeEqual", () => {
  it("matches identical secrets", () => {
    expect(constantTimeEqual("s3cret-value", "s3cret-value")).toBe(true);
  });
  it.each([
    ["s3cret-value", "s3cret-valuX"],
    ["s3cret", "s3cret-value"],
    ["s3cret-value", ""],
    ["", "x"],
  ])("rejects %j vs %j", (a, b) => {
    expect(constantTimeEqual(a, b)).toBe(false);
  });
});
