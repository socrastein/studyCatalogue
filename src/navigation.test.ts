/**
 * Tests for the navigation links: the review link appears only while drafts wait, before Settings, with their count.
 */
import { describe, expect, it } from "vitest";
import { NAV_LINKS, navLinks } from "./navigation";

describe("navLinks", () => {
  it("is the main links alone while no draft waits", () => {
    expect(navLinks(0)).toEqual(NAV_LINKS);
    expect(navLinks(0).map((link) => link.path)).not.toContain("/review");
  });

  it("adds Review Summaries with the count before Settings while drafts wait", () => {
    const links = navLinks(3);
    expect(links.map((link) => link.name)).toEqual([
      "Studies",
      "Add a study",
      "Tags",
      "Review Summaries (3)",
      "Settings",
    ]);
    expect(links.find((link) => link.path === "/review")).toBeDefined();
  });

  it("keeps Settings last", () => {
    expect(navLinks(1).at(-1)?.name).toBe("Settings");
  });
});
