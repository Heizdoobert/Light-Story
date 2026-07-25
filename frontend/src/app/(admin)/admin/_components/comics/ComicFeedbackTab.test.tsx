import { describe, expect, it } from "vitest";
import { formatDisplayDate, getSearchableText } from "./ComicFeedbackTab";

describe("ComicFeedbackTab helpers", () => {
  it("normalizes missing values safely for search", () => {
    expect(getSearchableText(undefined)).toBe("");
    expect(getSearchableText(null)).toBe("");
    expect(getSearchableText("  Hello  ")).toBe("hello");
    expect(getSearchableText(42)).toBe("42");
  });

  it("returns a placeholder for invalid dates", () => {
    expect(formatDisplayDate(undefined)).toBe("—");
    expect(formatDisplayDate("invalid-date")).toBe("—");
  });
});
