const colorThemes = {
  blue: { light: "#0353CC", dark: "#5B9FFF" },
  purple: { light: "#3B2861", dark: "#9D88CC" },
  pink: { light: "#7A007A", dark: "#E066E0" },
  red: { light: "#8B1D1A", dark: "#F07070" },
  orange: { light: "#A84400", dark: "#F07E2A" },
  yellow: { light: "#B58B00", dark: "#FED06C" },
  green: { light: "#0A7A44", dark: "#34C97A" },
};

// For setting CSS root variables related to light and color themes
const root = document.documentElement;
let colorTheme: keyof typeof colorThemes = "blue";

function setToLightMode() {
  root.setAttribute("data-theme", "light");
}

function setToDarkMode() {
  root.setAttribute("data-theme", "dark");
}

const appSettings = {
  getMode() {
    return root.getAttribute("data-theme") as "light" | "dark";
  },

  setMode(mode: "light" | "dark") {
    if (mode === this.getMode()) return;

    if (mode === "light") {
      setToLightMode();
    } else {
      setToDarkMode();
    }
  },

  toggleLightMode() {
    const currentMode = this.getMode();
    if (currentMode === "light") {
      setToDarkMode();
    } else {
      setToLightMode();
    }
  },

  getColorTheme() {
    return colorTheme;
  },

  setColorTheme(theme: keyof typeof colorThemes) {
    const selectedTheme = colorThemes[theme];
    const currentMode = this.getMode();

    if (currentMode === "light") {
      root.style.setProperty("--primary-theme", selectedTheme.light);
    } else {
      root.style.setProperty("--primary-theme", selectedTheme.dark);
    }
  },
};

export default appSettings;
