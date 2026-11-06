/**
 * Browser tests: they drive the real, built app in Firefox and check each page with axe for accessibility problems.
 *
 *   npm run test:browser    build, serve the build with `vite preview`, run every spec in e2e/
 *
 * The build is a fresh one every run (it takes well under a second), so a test never runs against stale output.
 */
import { defineConfig, devices } from "@playwright/test";

const PORT = 4175;
const appUrl = `http://localhost:${PORT}/`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: "list",

  use: {
    baseURL: appUrl,
    trace: "retain-on-failure",
  },

  // Every spec runs in both modes: the app follows the device's colour scheme by default, and each mode has its own
  // colours, so axe checks contrast in each
  projects: [
    {
      name: "firefox-light",
      use: { ...devices["Desktop Firefox"], colorScheme: "light" },
    },
    {
      name: "firefox-dark",
      use: { ...devices["Desktop Firefox"], colorScheme: "dark" },
    },
  ],

  webServer: {
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: appUrl,
    reuseExistingServer: false,
  },
});
