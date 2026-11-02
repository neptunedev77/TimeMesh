import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./redirect";
import { loginSchema, registerSchema, resetPasswordSchema } from "./schemas";

describe("safeRedirectPath", () => {
  it("keeps paths inside the app", () => {
    expect(safeRedirectPath("/projects?tab=1")).toBe("/projects?tab=1");
  });

  it.each(["https://evil.test", "//evil.test", "/\\evil.test", "evil", "", null, undefined])(
    "rejects %s",
    (path) => {
      expect(safeRedirectPath(path)).toBe("/dashboard");
    },
  );
});

describe("auth schemas", () => {
  it("accepts valid details and trims the name", () => {
    expect(
      registerSchema.parse({ name: "  Ana ", email: "ana@example.test", password: "12345678" }).name,
    ).toBe("Ana");
  });

  it("rejects invalid details", () => {
    expect(loginSchema.safeParse({ email: "ana", password: "x" }).success).toBe(false);
    expect(registerSchema.safeParse({ name: " ", email: "a@b.pt", password: "12345678" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ password: "1234567" }).success).toBe(false);
  });
});
