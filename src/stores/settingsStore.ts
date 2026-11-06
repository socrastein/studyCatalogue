/**
 * Appearance settings: light, dark or system mode, and the colour theme (the accent colour). They are remembered in
 * localStorage as a convenience for this browser; if storage is blocked or holds something unreadable, the defaults
 * are used and nothing breaks.
 *
 * Both are applied to the root element: the resolved mode as the `data-theme` attribute that `style.css` switches its
 * tokens on, and the theme's shade for that mode as `--color-theme`. In system mode the page follows the operating
 * system's preference, including when it changes while the page is open.
 */
import { reactive, readonly, type DeepReadonly } from "vue";

/** The accent colour of each theme, one shade for each mode (darker on the light background, lighter on the dark). */
export const COLOR_THEMES = {
  blue: { light: "#0353CC", dark: "#5B9FFF" },
  purple: { light: "#3B2861", dark: "#9D88CC" },
  pink: { light: "#7A007A", dark: "#E066E0" },
  red: { light: "#8B1D1A", dark: "#F07070" },
  orange: { light: "#A84400", dark: "#F07E2A" },
  yellow: { light: "#B58B00", dark: "#FED06C" },
  green: { light: "#0A7A44", dark: "#34C97A" },
} as const;

export type ColorThemeName = keyof typeof COLOR_THEMES;

/** The mode choices, as offered in Settings. */
export const MODE_CHOICES = [
  { id: "system", label: "Same as my device" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
] as const;

export type ModeChoice = (typeof MODE_CHOICES)[number]["id"];

export type Settings = { mode: ModeChoice; colorTheme: ColorThemeName };

/** Where the settings are remembered: a separate key from the catalogue, so neither can damage the other. */
export const SETTINGS_KEY = "studyCatalogue.settings";

/** A first visit follows the device's mode, with the purple theme. */
export const DEFAULT_SETTINGS: Settings = {
  mode: "system",
  colorTheme: "purple",
};

/** The part of a MediaQueryList the store uses: whether the device prefers dark mode, and hearing when that changes. */
export type DarkModePreference = {
  readonly matches: boolean;
  addEventListener(type: "change", listener: () => void): void;
};

export type SettingsStore = {
  settings: DeepReadonly<Settings>;
  setMode(mode: ModeChoice): void;
  setColorTheme(theme: ColorThemeName): void;
};

/**
 * A settings store that starts from what the storage remembers, applies it to the page at once, and keeps the page
 * in step with the device in system mode.
 *
 * @param storage Where the settings are remembered; localStorage in the app.
 * @param darkModePreference The device's dark mode preference; `matchMedia("(prefers-color-scheme: dark)")` in the app.
 */
export function createSettingsStore(
  storage: Storage,
  darkModePreference: DarkModePreference,
): SettingsStore {
  const settings = reactive<Settings>(readSettings(storage));
  const applySettings = () => applyToPage(settings, darkModePreference.matches);

  /** Changes some settings, shows them on the page and remembers them. */
  function update(changes: Partial<Settings>): void {
    Object.assign(settings, changes);
    applySettings();
    rememberSettings(storage, settings);
  }

  applySettings();
  // In system mode, the page follows the device switching between light and dark while it is open
  darkModePreference.addEventListener("change", applySettings);

  return {
    settings: readonly(settings),
    setMode: (mode) => update({ mode }),
    setColorTheme: (colorTheme) => update({ colorTheme }),
  };
}

let appStore: SettingsStore | undefined;

/**
 * The app's settings store, on localStorage and the device's dark mode preference. Created on first use, which
 * main.ts does before mounting so the page never flashes in the wrong colours.
 */
export function useSettings(): SettingsStore {
  appStore ??= createSettingsStore(
    localStorage,
    window.matchMedia("(prefers-color-scheme: dark)"),
  );
  return appStore;
}

/**
 * The mode the page actually shows: the chosen one, or in system mode the device's.
 *
 * @param mode The chosen mode.
 * @param prefersDark Whether the device prefers dark mode.
 */
export function resolveMode(
  mode: ModeChoice,
  prefersDark: boolean,
): "light" | "dark" {
  if (mode !== "system") return mode;
  return prefersDark ? "dark" : "light";
}

/** Sets data-theme and --color-theme on the root element for these settings. */
function applyToPage(settings: Settings, prefersDark: boolean): void {
  const mode = resolveMode(settings.mode, prefersDark);
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.style.setProperty(
    "--color-theme",
    COLOR_THEMES[settings.colorTheme][mode],
  );
}

/** The remembered settings, with the default for anything missing, unreadable or unknown. */
function readSettings(storage: Storage): Settings {
  const remembered = parseRemembered(storage);
  const mode = MODE_CHOICES.find((choice) => choice.id === remembered.mode)?.id;
  const colorTheme = Object.hasOwn(COLOR_THEMES, String(remembered.colorTheme))
    ? (remembered.colorTheme as ColorThemeName)
    : undefined;
  return {
    mode: mode ?? DEFAULT_SETTINGS.mode,
    colorTheme: colorTheme ?? DEFAULT_SETTINGS.colorTheme,
  };
}

/** Whatever object storage holds under the settings key; empty when there is none or it cannot be read. */
function parseRemembered(storage: Storage): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(SETTINGS_KEY) ?? "{}");
    const isObject = typeof parsed === "object" && parsed !== null;
    return isObject ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Remembers the settings; a blocked or full storage just means they are not remembered next time. */
function rememberSettings(storage: Storage, settings: Settings): void {
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Remembering appearance is a convenience; failing to is not worth interrupting anyone for
  }
}
