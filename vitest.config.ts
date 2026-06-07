import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    // PGlite spins a fresh WASM Postgres per integration test; under full-suite
    // parallelism cold starts can exceed the 5s default. 20s absorbs contention.
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
