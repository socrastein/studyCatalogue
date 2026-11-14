/**
 * A stand-in for the home server in unit tests: a `fetch` function that keeps a numbered catalogue in memory and
 * answers the way server/requestHandler.ts does (200, 409 with the current copy), and can be switched off.
 */
import { newCatalogue, type Catalogue } from "../catalogue/catalogue";
import {
  numberedCatalogueText,
  readSaveRequest,
  type NumberedCatalogue,
} from "../catalogue/homeServerProtocol";
import type { FetchFunction } from "./homeServerClient";

export type FakeHomeServer = {
  /** The `fetch` to give the code under test. */
  fetch: FetchFunction;
  /** The server's copy right now. */
  copy: NumberedCatalogue;
  /** While true every request fails as if the network were down. */
  isOffline: boolean;
  /** Every save request answered, in order, with its base revision and what it answered. */
  saves: { baseRevision: number; status: number }[];
  /** Changes the server's copy as another device's save would. */
  saveFromAnotherDevice(catalogue: Catalogue): void;
};

/**
 * A fake server holding the given catalogue at the given revision.
 *
 * @param catalogue What it holds at the start; a new catalogue by default.
 * @param revision The starting revision.
 */
export function createFakeHomeServer(
  catalogue: Catalogue = newCatalogue(),
  revision = 0,
): FakeHomeServer {
  const server: FakeHomeServer = {
    copy: { revision, catalogue },
    isOffline: false,
    saves: [],
    saveFromAnotherDevice(newCatalogueFromOtherDevice) {
      server.copy = {
        revision: server.copy.revision + 1,
        catalogue: newCatalogueFromOtherDevice,
      };
    },
    fetch: async (_input, init) => {
      if (server.isOffline) throw new TypeError("NetworkError");
      if (init?.method === "PUT") return answerSave(server, String(init.body));
      return json(200, numberedCatalogueText(server.copy));
    },
  };
  return server;
}

/** The answer to a save: stored when the base revision is current, else the current copy with 409. */
function answerSave(server: FakeHomeServer, body: string): Response {
  const request = readSaveRequest(JSON.parse(body));
  if (request.kind === "invalid") return json(400, "{}");
  const { baseRevision, catalogue } = request.message;
  const isCurrent = baseRevision === server.copy.revision;
  const status = isCurrent ? 200 : 409;
  server.saves.push({ baseRevision, status });
  if (!isCurrent) return json(409, numberedCatalogueText(server.copy));
  server.copy = { revision: baseRevision + 1, catalogue };
  return json(200, JSON.stringify({ revision: server.copy.revision }));
}

/** A JSON response with the status. */
function json(status: number, body: string): Response {
  return new Response(body, { status });
}
