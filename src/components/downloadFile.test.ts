/**
 * Tests for backup file names.
 */
import { describe, expect, it } from "vitest";
import { backupFileName, websiteExportFileName } from "./downloadFile";

describe("websiteExportFileName", () => {
  it("is the backup's name with website in it, so the two files cannot be mistaken for each other", () => {
    expect(websiteExportFileName(new Date(2026, 10, 14))).toBe(
      "study-catalogue-website-2026-11-14.json",
    );
  });
});

describe("backupFileName", () => {
  it("names the file after the local date, with zero-padded month and day", () => {
    expect(backupFileName(new Date(2026, 0, 5, 23, 30))).toBe(
      "study-catalogue-2026-01-05.json",
    );
  });
});
