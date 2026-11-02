import { describe, expect, it } from "vitest";
import { formatDateTime, formatPeriod } from "@/lib/format";
import { generateToken, hashToken } from "./membership";
import { displayNameSchema, projectNameSchema } from "./schemas";

describe("names", () => {
  it("trims and accepts a name", () => {
    expect(projectNameSchema.parse("  Viagem ")).toBe("Viagem");
    expect(displayNameSchema.parse(" Rita ")).toBe("Rita");
  });

  it("rejects empty or very long names", () => {
    expect(projectNameSchema.safeParse("  ").success).toBe(false);
    expect(projectNameSchema.safeParse("x".repeat(121)).success).toBe(false);
    expect(displayNameSchema.safeParse("x".repeat(81)).success).toBe(false);
  });
});

describe("tokens", () => {
  it("generates unique tokens and stores a different hash", () => {
    const token = generateToken();

    expect(token).not.toBe(generateToken());
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(hashToken(token)).not.toBe(token);
    expect(hashToken(token)).toBe(hashToken(token));
  });
});

describe("formatting", () => {
  it("uses Portuguese dates and a 24-hour clock", () => {
    expect(formatPeriod("2026-11-02", "2026-11-08")).toBe("2/11/2026 – 8/11/2026");
    expect(formatDateTime("2026-07-01T20:30:00Z", "Europe/Lisbon")).toContain("21:30");
  });
});
