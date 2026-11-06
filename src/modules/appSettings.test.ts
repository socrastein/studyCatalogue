// @vitest-environment jsdom
/**
 * Tests for the mode and colour theme settings: what they write to the root element, and that the accent colour
 * follows the mode.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  COLOR_THEMES,
  getColorTheme,
  getMode,
  setColorTheme,
  setMode,
  toggleMode,
} from "./appSettings";

/** The accent colour currently set on the root element. */
function accentColor(): string {
  return document.documentElement.style.getPropertyValue("--color-theme");
}

beforeEach(() => {
  document.documentElement.removeAttribute("data-theme");
  setColorTheme("blue");
});

describe("getMode", () => {
  it("is light when no mode was ever set, matching the default tokens in style.css", () => {
    expect(getMode()).toBe("light");
  });
});

describe("setMode", () => {
  it("sets data-theme on the root element", () => {
    setMode("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(getMode()).toBe("dark");
  });

  it("re-applies the colour theme in the shade for the new mode", () => {
    setColorTheme("purple");
    setMode("dark");
    expect(accentColor()).toBe(COLOR_THEMES.purple.dark);
    setMode("light");
    expect(accentColor()).toBe(COLOR_THEMES.purple.light);
  });
});

describe("toggleMode", () => {
  it("switches light to dark and back", () => {
    toggleMode();
    expect(getMode()).toBe("dark");
    toggleMode();
    expect(getMode()).toBe("light");
  });
});

describe("setColorTheme", () => {
  it("sets --color-theme, the property style.css reads", () => {
    setMode("dark");
    setColorTheme("green");
    expect(accentColor()).toBe(COLOR_THEMES.green.dark);
  });

  it("remembers the theme for getColorTheme", () => {
    setColorTheme("orange");
    expect(getColorTheme()).toBe("orange");
  });
});
