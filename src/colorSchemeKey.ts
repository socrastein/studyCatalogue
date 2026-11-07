/**
 * Where the app saves the person's light/dark choice on their device: "light", "dark" or "auto" (follow the system).
 * Every socrastein.github.io project shares one browser origin, so the key is prefixed with the project's name.
 *
 * The shared ThemeButton reads and writes it (lifting-school-ui's useColorScheme), and `index.html` applies it before
 * the app loads, so the page never flashes light then dark: the same key and values, written out there by hand because
 * that script runs before any module does.
 */
export const COLOR_SCHEME_STORAGE_KEY = "studyCatalogue.colorScheme";
