/**
 * Bundles the home server (server/main.ts) and the app code it shares (src/catalogue) into one plain JavaScript file,
 * dist-server/main.js, that `node` runs without TypeScript support or a loader. The app's source imports files without
 * their extensions, which Node cannot resolve, so the server is bundled the way the app is.
 */
import { defineConfig } from "vite";

export default defineConfig({
  publicDir: false,
  build: {
    ssr: "server/main.ts",
    outDir: "dist-server",
    emptyOutDir: true,
    target: "node22",
  },
});
