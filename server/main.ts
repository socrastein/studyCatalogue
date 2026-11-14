/**
 * The home server's entry point: reads the settings (settings.ts), checks the data file is readable, and listens.
 * Built into dist-server/main.js by `npm run build:server` (vite.server.config.ts) so plain `node` can run it.
 */
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { openCatalogueFile } from "./catalogueFile";
import { createRequestHandler } from "./requestHandler";
import { readSettings } from "./settings";

/** The repository folder: this file is in server/ or dist-server/, one level below it. */
const repositoryFolder = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Starts listening; exits with a message when the settings or the data file are bad. */
async function main(): Promise<void> {
  const settings = readSettings(
    process.argv.slice(2),
    process.env,
    join(repositoryFolder, "dist"),
  );
  const catalogueFile = await openCatalogueFile(settings.dataDirectory);
  // Fail now, not on the first request, when the data file cannot be read: it is never overwritten or replaced
  await catalogueFile.read();
  const server = createServer(
    createRequestHandler({
      catalogueFile,
      distDirectory: settings.distDirectory,
      bodyLimitBytes: settings.bodyLimitBytes,
      log: (line) => console.log(line),
    }),
  );
  server.listen(settings.port, settings.host, () => {
    console.log(
      `Study Catalogue home server on ${settings.host}:${settings.port}, data in ${settings.dataDirectory}`,
    );
  });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
