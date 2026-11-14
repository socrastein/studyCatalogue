/**
 * Entry point: loads the shared Lifting School look, then the app's own styles on top of it, chooses where the
 * catalogue is kept (stores/startCatalogue.ts), and mounts the Vue app with its router. The saved light/dark choice
 * is applied earlier still, by a script in `index.html`.
 */
// Tokens, fonts, base styles and component classes from the lifting-school-ui library; must load before style.css
import "lifting-school-ui/css/index.css";
import "./style.css";
import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router.ts";
import { startCatalogue } from "./stores/startCatalogue";

// The catalogue's storage is chosen before mounting, so the first page drawn already shows the real catalogue
void startCatalogue().then(() => createApp(App).use(router).mount("#app"));
