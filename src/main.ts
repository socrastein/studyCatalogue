/**
 * Entry point: applies the remembered appearance settings, then mounts the Vue app with its router. Settings come
 * first so the page never shows a flash of the wrong mode or colour.
 */
import "./style.css";
import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router.ts";
import { useSettings } from "./stores/settingsStore.ts";

useSettings();

createApp(App).use(router).mount("#app");
