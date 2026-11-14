/**
 * The messages the app and the home server (server/) exchange about the catalogue, shared by both so neither
 * duplicates the other's idea of the format. Pure: no network, files or DOM.
 *
 * The server keeps a numbered copy of the catalogue. `GET` answers it; `PUT` replaces it only when the sender says
 * which revision it was based on and that is still the stored one, so two devices can never silently overwrite each
 * other (the loser gets the current copy back and merges, see stores/homeServerStorage.ts). The catalogue travels as
 * the same JSON object `serializeCatalogue` writes, schema version included.
 */
import type { Catalogue } from "./catalogue";
import { parseCatalogue, serializeCatalogue } from "./serialization";
import { readRecord, ShapeError } from "./readers";

/** The address, on the app's own origin, where the home server keeps the catalogue. */
export const CATALOGUE_API_PATH = "/api/catalogue";

/** The server's copy: the catalogue and the number of the save that made it (0 before the first save). */
export type NumberedCatalogue = { revision: number; catalogue: Catalogue };

/** A save request: the catalogue, and the revision of the server copy it was made from. */
export type SaveRequest = { baseRevision: number; catalogue: Catalogue };

/** The result of reading a message from the other side: what it held, or why it cannot be trusted. */
export type ReadMessage<Message> =
  { kind: "valid"; message: Message } | { kind: "invalid"; problem: string };

/**
 * The text of the server's answer to a read, and to a refused save: its copy and revision.
 *
 * @param copy The server's current copy.
 */
export function numberedCatalogueText(copy: NumberedCatalogue): string {
  return JSON.stringify({
    revision: copy.revision,
    catalogue: catalogueAsJson(copy.catalogue),
  });
}

/**
 * The text of a save request.
 *
 * @param request The revision the catalogue is based on, and the catalogue.
 */
export function saveRequestText(request: SaveRequest): string {
  return JSON.stringify({
    baseRevision: request.baseRevision,
    catalogue: catalogueAsJson(request.catalogue),
  });
}

/**
 * Reads the server's copy from parsed JSON (an answer to a read, or a refused save), checking the catalogue in full.
 *
 * @param value Parsed JSON of unknown shape.
 */
export function readNumberedCatalogue(
  value: unknown,
): ReadMessage<NumberedCatalogue> {
  return readWithRevision(value, "revision", (revision, catalogue) => ({
    revision,
    catalogue,
  }));
}

/**
 * Reads a save request from parsed JSON, checking the catalogue in full with the app's own parser.
 *
 * @param value Parsed JSON of unknown shape.
 */
export function readSaveRequest(value: unknown): ReadMessage<SaveRequest> {
  return readWithRevision(value, "baseRevision", (baseRevision, catalogue) => ({
    baseRevision,
    catalogue,
  }));
}

/** The catalogue as the JSON object `serializeCatalogue` writes, to nest inside a message. */
function catalogueAsJson(catalogue: Catalogue): unknown {
  return JSON.parse(serializeCatalogue(catalogue));
}

/** Reads `{ [revisionField]: number, catalogue }`, building the message from the two checked parts. */
function readWithRevision<Message>(
  value: unknown,
  revisionField: string,
  build: (revision: number, catalogue: Catalogue) => Message,
): ReadMessage<Message> {
  try {
    const record = readRecord(value, "the message");
    const revision = readRevision(record[revisionField], revisionField);
    const parsed = parseCatalogue(JSON.stringify(record.catalogue ?? null));
    if (parsed.kind === "invalid")
      return { kind: "invalid", problem: parsed.problem };
    return { kind: "valid", message: build(revision, parsed.catalogue) };
  } catch (error) {
    if (error instanceof ShapeError)
      return { kind: "invalid", problem: `${error.message}.` };
    throw error;
  }
}

/** A revision: a whole number, 0 or more. */
function readRevision(value: unknown, where: string): number {
  const isRevision =
    typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
  if (!isRevision) throw new ShapeError(`${where} should be a whole number`);
  return value;
}
