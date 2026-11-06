/**
 * Unique ids for studies and tags.
 */

/** 8 random bytes, written as 16 hex characters: 64 bits, so two ids colliding in a catalogue of thousands is not a
 * practical concern. */
const ID_BYTE_COUNT = 8;

/**
 * A new random id, e.g. "3f9a0c4be17d2286".
 *
 * Uses `crypto.getRandomValues` rather than `crypto.randomUUID`, because browsers only offer the latter on secure
 * origins, and the dev server is opened over plain HTTP from other machines on the LAN.
 */
export function createId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ID_BYTE_COUNT));
  return Array.from(bytes, toTwoHexDigits).join("");
}

/** One byte as two lowercase hex digits, e.g. 10 as "0a". */
function toTwoHexDigits(byte: number): string {
  return byte.toString(16).padStart(2, "0");
}
