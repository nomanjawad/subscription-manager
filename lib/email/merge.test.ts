import { describe, expect, it } from "vitest";
import { mergeHtml, mergeText } from "./merge";

describe("mergeHtml", () => {
  it("substitutes known tags", () => {
    expect(mergeHtml("Hi {{name}}", { name: "Jane" })).toBe("Hi Jane");
  });

  it("tolerates surrounding whitespace in the tag", () => {
    expect(mergeHtml("{{ name }}", { name: "Jane" })).toBe("Jane");
  });

  it("renders unknown / null / empty tags as blank", () => {
    expect(mergeHtml("[{{missing}}]", {})).toBe("[]");
    expect(mergeHtml("[{{x}}]", { x: null })).toBe("[]");
    expect(mergeHtml("[{{x}}]", { x: "" })).toBe("[]");
  });

  it("HTML-escapes substituted values (injection guard)", () => {
    expect(
      mergeHtml("{{reason}}", { reason: "<script>alert('x')</script>" }),
    ).toBe("&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
  });

  it("coerces numbers to strings", () => {
    expect(mergeHtml("{{n}}", { n: 42 })).toBe("42");
  });
});

describe("mergeText", () => {
  it("substitutes without HTML-escaping (subject line)", () => {
    expect(mergeText("Re: {{platform}}", { platform: "A & B" })).toBe(
      "Re: A & B",
    );
  });
});
