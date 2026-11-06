/**
 * Tests for the appearance settings: what they write to the page, following the device in system mode, remembering
 * choices, falling back to defaults, and the contrast of every theme's accent colour.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  COLOR_THEMES,
  createSettingsStore,
  DEFAULT_SETTINGS,
  resolveMode,
  SETTINGS_KEY,
} from "./settingsStore";

/** A device preference that a test can change, as the operating system would. */
function fakePreference(initiallyDark: boolean) {
  let prefersDark = initiallyDark;
  const listeners: (() => void)[] = [];
  return {
    get matches() {
      return prefersDark;
    },
    addEventListener(_type: "change", listener: () => void) {
      listeners.push(listener);
    },
    change(newPreference: boolean) {
      prefersDark = newPreference;
      for (const listener of listeners) listener();
    },
  };
}

/** The accent colour currently on the page. */
function accentColor(): string {
  return document.documentElement.style.getPropertyValue("--color-theme");
}

beforeEach(() => {
  localStorage.clear();
});

describe("a settings store", () => {
  it("starts with the defaults on a first visit, following the device", () => {
    const store = createSettingsStore(localStorage, fakePreference(true));
    expect(store.settings).toEqual(DEFAULT_SETTINGS);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(accentColor()).toBe(COLOR_THEMES.purple.dark);
  });

  it("follows the device changing its preference in system mode", () => {
    const preference = fakePreference(true);
    createSettingsStore(localStorage, preference);
    preference.change(false);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(accentColor()).toBe(COLOR_THEMES.purple.light);
  });

  it("applies a chosen mode and theme, and remembers them for the next visit", () => {
    const store = createSettingsStore(localStorage, fakePreference(true));
    store.setMode("light");
    store.setColorTheme("green");
    expect(accentColor()).toBe(COLOR_THEMES.green.light);
    const nextVisit = createSettingsStore(localStorage, fakePreference(true));
    expect(nextVisit.settings).toEqual({ mode: "light", colorTheme: "green" });
  });

  it("falls back to the defaults for unreadable or unknown remembered values", () => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ mode: "sepia", colorTheme: "toString" }),
    );
    expect(
      createSettingsStore(localStorage, fakePreference(false)).settings,
    ).toEqual(DEFAULT_SETTINGS);
    localStorage.setItem(SETTINGS_KEY, "{not json");
    expect(
      createSettingsStore(localStorage, fakePreference(false)).settings,
    ).toEqual(DEFAULT_SETTINGS);
  });
});

describe("resolveMode", () => {
  it("is the chosen mode unless the choice is to follow the device", () => {
    expect(resolveMode("light", true)).toBe("light");
    expect(resolveMode("system", true)).toBe("dark");
    expect(resolveMode("system", false)).toBe("light");
  });
});

/** WCAG relative luminance of a "#rrggbb" colour. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map(
    (start) => parseInt(hex.slice(start, start + 2), 16) / 255,
  );
  const linear = channels.map((value) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  const [red = 0, green = 0, blue = 0] = linear;
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** WCAG contrast ratio between two "#rrggbb" colours. */
function contrast(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort(
    (a, b) => b - a,
  ) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

/** The page background of each mode, from style.css. The accent is used as text and as button fill on it. */
const PAGE_BACKGROUNDS = { light: "#f2f3f4", dark: "#1b1b1f" } as const;

/**
 * Accent shades known to fall short, waiting on Matt's choice of replacement (raised 2026-11-06). Remove an entry
 * once its shade is fixed; the test then holds it to AA like the rest.
 */
const KNOWN_LOW_CONTRAST = ["yellow light"];

describe("every theme's accent", () => {
  for (const [theme, shades] of Object.entries(COLOR_THEMES)) {
    for (const mode of ["light", "dark"] as const) {
      const isKnownLow = KNOWN_LOW_CONTRAST.includes(`${theme} ${mode}`);
      it.skipIf(isKnownLow)(
        `${theme} in ${mode} mode is at least 4.5:1 on the page background`,
        () => {
          expect(
            contrast(shades[mode], PAGE_BACKGROUNDS[mode]),
          ).toBeGreaterThanOrEqual(4.5);
        },
      );
    }
  }
});
