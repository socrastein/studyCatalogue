/**
 * Entry point: applies the starting mode and colour theme, then mounts the Vue app with its router.
 */
import "./style.css";
import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router.ts";
import { setColorTheme, setMode } from "./modules/appSettings.ts";

setMode("dark");
setColorTheme("purple");

createApp(App).use(router).mount("#app");
