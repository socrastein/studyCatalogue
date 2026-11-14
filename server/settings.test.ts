/**
 * Tests for the server's settings: defaults, environment variables, flags winning over them, and bad input.
 */
import { homedir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_BODY_LIMIT_BYTES,
  DEFAULT_PORT,
  readSettings,
} from "./settings";

describe("the server's settings", () => {
  it("default to the owner's data folder, port 5185, every interface and a 32 MiB limit", () => {
    const settings = readSettings([], {}, "/app/dist");
    expect(settings).toEqual({
      dataDirectory: join(homedir(), ".local", "share", "studyCatalogue"),
      port: DEFAULT_PORT,
      host: "0.0.0.0",
      distDirectory: "/app/dist",
      bodyLimitBytes: DEFAULT_BODY_LIMIT_BYTES,
    });
    expect(DEFAULT_PORT).toBe(5185);
  });

  it("read environment variables", () => {
    const settings = readSettings(
      [],
      { STUDY_CATALOGUE_PORT: "4195", STUDY_CATALOGUE_DATA_DIR: "/data" },
      "/app/dist",
    );
    expect(settings).toMatchObject({ port: 4195, dataDirectory: "/data" });
  });

  it("let a flag win over the environment, in both flag spellings", () => {
    const environment = { STUDY_CATALOGUE_PORT: "4195" };
    expect(readSettings(["--port", "4196"], environment, "/d").port).toBe(4196);
    expect(readSettings(["--port=4197"], environment, "/d").port).toBe(4197);
  });

  it("refuse an unknown flag, a missing value and a port that is not a number", () => {
    expect(() => readSettings(["--colour", "red"], {}, "/d")).toThrow(
      'Unknown option "--colour"',
    );
    expect(() => readSettings(["--port"], {}, "/d")).toThrow("needs a value");
    expect(() => readSettings(["--port", "abc"], {}, "/d")).toThrow(
      "whole number",
    );
  });
});
