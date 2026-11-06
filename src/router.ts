/**
 * The app's pages and their URLs. Each route names its page title in `meta.title`; after every navigation the
 * browser tab's title is set from it, so the tab matches the nav link that led there.
 */
import { createRouter, createWebHistory } from "vue-router";
import BrowseView from "./views/BrowseView.vue";
import NewStudyView from "./views/NewStudyView.vue";
import TagsView from "./views/TagsView.vue";
import SettingsView from "./views/SettingsView.vue";

/** Shown in every tab title after the page's own title, e.g. "Tags - Study Catalogue". */
export const APP_NAME = "Study Catalogue";

declare module "vue-router" {
  interface RouteMeta {
    title: string;
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: BrowseView, meta: { title: "Studies" } },
    {
      path: "/studies/new",
      component: NewStudyView,
      meta: { title: "Add a study" },
    },
    { path: "/tags", component: TagsView, meta: { title: "Tags" } },
    { path: "/settings", component: SettingsView, meta: { title: "Settings" } },
  ],
});

router.afterEach((to) => {
  document.title = `${to.meta.title} - ${APP_NAME}`;
});
