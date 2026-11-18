/**
 * Writing a file so that a crash or a full disk can never leave half a file behind: the text goes to a temporary
 * file in the same directory (so the final rename stays on one filesystem), is flushed to disk, and only then
 * renamed over the real name. Rename replaces a file in one step, so readers see the old file or the new one.
 */
import { open, rename, rm } from "node:fs/promises";
import { dirname, basename, join } from "node:path";

/** The file operations the write depends on; tests replace `rename` to make a write fail at its last step. */
export type AtomicWriteFileSystem = {
  rename: (from: string, to: string) => Promise<void>;
};

const nodeFileSystem: AtomicWriteFileSystem = { rename };

/** `Math.random().toString(36)` begins with "0.", which the temporary name leaves out. */
const RANDOM_DIGITS_START = 2;

/**
 * Writes the text to the path atomically. On any failure the old file (if there was one) is untouched and the
 * temporary file is removed.
 *
 * @param path The file to create or replace.
 * @param text What the file will hold.
 * @param fileSystem Defaults to Node's; replaced in tests.
 */
export async function writeFileAtomically(
  path: string,
  text: string,
  fileSystem: AtomicWriteFileSystem = nodeFileSystem,
): Promise<void> {
  // The process id and a random part keep two writers from sharing a temporary name
  // Base 36 writes digits and letters only, so the name stays short and safe in a file name
  const randomPart = Math.random().toString(36).slice(RANDOM_DIGITS_START);
  const suffix = `${process.pid}-${randomPart}`;
  const temporaryPath = join(dirname(path), `.${basename(path)}.${suffix}.tmp`);
  try {
    await writeAndFlush(temporaryPath, text);
    await fileSystem.rename(temporaryPath, path);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}

/** Creates the file, writes the text and forces it onto the disk before closing. */
async function writeAndFlush(path: string, text: string): Promise<void> {
  const file = await open(path, "w");
  try {
    await file.writeFile(text, "utf8");
    await file.sync();
  } finally {
    await file.close();
  }
}
