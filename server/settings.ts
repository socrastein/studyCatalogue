/**
 * The server's settings, read from command-line flags, then environment variables, then the defaults below.
 *
 *   --data-dir / STUDY_CATALOGUE_DATA_DIR   where the catalogue and its versions are kept
 *   --port / STUDY_CATALOGUE_PORT           the port to listen on
 *   --host / STUDY_CATALOGUE_HOST           the address to listen on ("0.0.0.0" is every network interface)
 *   --dist-dir / STUDY_CATALOGUE_DIST_DIR   the built app to serve
 *   --body-limit-bytes / STUDY_CATALOGUE_BODY_LIMIT_BYTES   the largest save accepted
 */
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export type ServerSettings = {
  dataDirectory: string;
  port: number;
  host: string;
  distDirectory: string;
  bodyLimitBytes: number;
};

/** The port the home server listens on unless told otherwise. */
export const DEFAULT_PORT = 5185;

/**
 * The largest save accepted, 32 MiB. A study with an abstract is about 3 KB of JSON, so this holds ten thousand
 * studies with room to spare, while still stopping a runaway upload.
 */
export const DEFAULT_BODY_LIMIT_BYTES = 32 * 1024 * 1024;

/**
 * Reads the settings.
 *
 * @param argv The command-line arguments after the script name, e.g. ["--port", "5185"].
 * @param environment The environment variables.
 * @param defaultDistDirectory Where the built app is when no setting names it.
 * @throws Error with a message for the person when a flag is unknown or a number is not one.
 */
export function readSettings(
  argv: string[],
  environment: Record<string, string | undefined>,
  defaultDistDirectory: string,
): ServerSettings {
  const flags = readFlags(argv);
  /** The flag's value, else the environment variable's, else undefined. */
  const choice = (flag: string, variable: string): string | undefined =>
    flags.get(flag) ?? environment[variable];
  return {
    dataDirectory: resolve(
      choice("data-dir", "STUDY_CATALOGUE_DATA_DIR") ??
        join(homedir(), ".local", "share", "studyCatalogue"),
    ),
    port: readWholeNumber(
      "port",
      choice("port", "STUDY_CATALOGUE_PORT"),
      DEFAULT_PORT,
    ),
    host: choice("host", "STUDY_CATALOGUE_HOST") ?? "0.0.0.0",
    distDirectory: resolve(
      choice("dist-dir", "STUDY_CATALOGUE_DIST_DIR") ?? defaultDistDirectory,
    ),
    bodyLimitBytes: readWholeNumber(
      "body-limit-bytes",
      choice("body-limit-bytes", "STUDY_CATALOGUE_BODY_LIMIT_BYTES"),
      DEFAULT_BODY_LIMIT_BYTES,
    ),
  };
}

const KNOWN_FLAGS = [
  "data-dir",
  "port",
  "host",
  "dist-dir",
  "body-limit-bytes",
];

/** The flags as name to value, for `--name value` and `--name=value`. */
function readFlags(argv: string[]): Map<string, string> {
  const flags = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index] ?? "";
    const [rawName = "", inlineValue] = argument.split(/=(.*)/s);
    const name = rawName.replace(/^--/, "");
    const isKnown = rawName.startsWith("--") && KNOWN_FLAGS.includes(name);
    if (!isKnown) throw new Error(`Unknown option "${argument}"`);
    const value = inlineValue ?? argv[(index += 1)];
    if (value === undefined) throw new Error(`--${name} needs a value`);
    flags.set(name, value);
  }
  return flags;
}

/** The setting as a whole number above 0, or the default when it is not given. */
function readWholeNumber(
  name: string,
  text: string | undefined,
  defaultValue: number,
): number {
  if (text === undefined) return defaultValue;
  const number = Number(text);
  if (!Number.isSafeInteger(number) || number <= 0)
    throw new Error(`${name} should be a whole number above 0, not "${text}"`);
  return number;
}
