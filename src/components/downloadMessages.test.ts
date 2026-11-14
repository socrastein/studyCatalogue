/**
 * Tests for the words shown after a download starts.
 */
import { describe, expect, it } from "vitest";
import {
  backupDownloadMessage,
  unreadableDownloadMessage,
  websiteExportMessage,
} from "./downloadMessages";

describe("websiteExportMessage", () => {
  it("names the file and counts the studies and the approved summaries", () => {
    expect(websiteExportMessage("site.json", 129, 19)).toBe(
      'Exported 129 studies (19 with summaries) to "site.json".',
    );
  });

  it("uses the singular for one study and for one summary", () => {
    expect(websiteExportMessage("site.json", 1, 1)).toBe(
      'Exported 1 study (1 with a summary) to "site.json".',
    );
  });

  it("says zero summaries plainly", () => {
    expect(websiteExportMessage("site.json", 3, 0)).toContain(
      "(0 with summaries)",
    );
  });
});

describe("the other download messages", () => {
  it("say that the download started, not that the file arrived, and name the file", () => {
    expect(backupDownloadMessage("a.json")).toBe(
      'Started the download of the backup "a.json".',
    );
    expect(unreadableDownloadMessage("b.txt")).toBe(
      'Started the download of the unreadable data as "b.txt".',
    );
  });
});
