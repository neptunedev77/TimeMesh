import { loadEnvFile } from "node:process";
import { defineConfig } from "vitest/config";

loadEnvFile(".env.local");

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/db/**/*.test.ts"],
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
