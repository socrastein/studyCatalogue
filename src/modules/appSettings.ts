/**
 * Light/dark mode and colour theme for the whole app. Both live on the root element: the mode as the `data-theme`
 * attribute that `style.css` switches its colour tokens on, and the colour theme as the `--color-theme` custom property,
 * whose shade depends on the mode (darker on a light background, lighter on a dark one).
 */

/** The accent colour of each theme, one shade for each mode. */
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
export type Mode = "light" | "dark";

/** The theme `style.css` defines `--color-theme` with, so the page matches this module before anything is set. */
let currentColorTheme: ColorThemeName = "blue";

/**
 * The mode the page is showing.
 *
 * @returns "dark" only when dark mode was set; "light" otherwise, because `style.css` uses the light tokens when the
 *   root element has no `data-theme` attribute.
 */
export function getMode(): Mode {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/**
 * Switches the page to the given mode, and the accent colour to the current theme's shade for that mode.
 *
 * @param mode The mode to show.
 */
export function setMode(mode: Mode): void {
  document.documentElement.dataset.theme = mode;
  applyColorTheme();
}

/** Switches from light to dark mode or back. */
export function toggleMode(): void {
  const oppositeMode = getMode() === "light" ? "dark" : "light";
  setMode(oppositeMode);
}

/**
 * The colour theme last set.
 *
 * @returns The theme's name; "blue" until one is set.
 */
export function getColorTheme(): ColorThemeName {
  return currentColorTheme;
}

/**
 * Switches the accent colour to the given theme, in the shade for the current mode.
 *
 * @param theme The theme to show.
 */
export function setColorTheme(theme: ColorThemeName): void {
  currentColorTheme = theme;
  applyColorTheme();
}

/** Sets `--color-theme` to the current theme's shade for the current mode. */
function applyColorTheme(): void {
  const shade = COLOR_THEMES[currentColorTheme][getMode()];
  document.documentElement.style.setProperty("--color-theme", shade);
}
