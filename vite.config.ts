/**
 * Vite builds and serves the app (with the Vue plugin for single-file components); Vitest reads the same file, so
 * unit tests resolve imports exactly as the app does.
 */
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue()],
  test: {
    // Unit tests live beside the code they test (the home server is in server/); e2e/ holds the Playwright browser tests, which Vitest must not run.
    include: ["src/**/*.test.ts", "server/**/*.test.ts"],
    // Components and the theme settings need a DOM; the pure catalogue code runs the same either way.
    environment: "jsdom",
  },
});
