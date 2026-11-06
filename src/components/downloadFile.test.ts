/**
 * Tests for backup file names.
 */
import { describe, expect, it } from "vitest";
import { backupFileName } from "./downloadFile";

describe("backupFileName", () => {
  it("names the file after the local date, with zero-padded month and day", () => {
    expect(backupFileName(new Date(2026, 0, 5, 23, 30))).toBe(
      "study-catalogue-2026-01-05.json",
    );
  });
});
