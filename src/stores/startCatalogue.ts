/**
 * Choosing where the catalogue lives, once, before the app mounts (so the first thing drawn is the real catalogue,
 * never an empty one). The app asks its own origin for `/api/catalogue`: a well-formed answer means the home server
 * (server/) is serving the app, so the catalogue lives there; anything else (a dev server, a static host, no
 * answer) means this browser's localStorage, exactly as before.
 *
 * One case is not silent. A device remembers (in its localStorage, which belongs to this origin alone) that this
 * origin once answered as a home server. If it does not answer now, the browser's own storage holds an empty or old
 * catalogue, not the home server's, so the app says so in a warning (`isHomeServerMissing`) until the server is back.
 */
import { createBrowserStorage } from "./browserStorage";
import {
  createCatalogueStoreOn,
  installCatalogueStore,
} from "./catalogueStore";
import type { CatalogueStorage } from "./catalogueStorage";
import { readonly, ref } from "vue";
import {
  askForServerCopy,
  type FetchFunction,
  type ServerAnswer,
} from "./homeServerClient";
import { createHomeServerStorage } from "./homeServerStorage";

/**
 * The localStorage key under which this origin is remembered as a home server ("true"), set when it answers as one.
 * It lives in the same localStorage as the browser's catalogue, but is never part of it.
 */
export const HOME_SERVER_SEEN_KEY = "studyCatalogue.originIsHomeServer";

/** The storage to use, and whether it stands in for a home server that did not answer. */
export type StartupChoice = {
  storage: CatalogueStorage;
  /** True when this origin answered as a home server on an earlier visit but not now: the browser's storage is then no substitute. */
  isHomeServerMissing: boolean;
};

/**
 * The storage to use: the home server's when it answers, otherwise the browser's.
 *
 * @param fetchFunction The browser's `fetch`; tests pass a fake.
 * @param browserStorage The browser's localStorage; tests pass a stand-in.
 */
export async function chooseCatalogueStorage(
  fetchFunction: FetchFunction,
  browserStorage: Storage,
): Promise<StartupChoice> {
  const answer = await askForServerCopy(fetchFunction);
  if (answer.kind === "copy") {
    rememberOriginIsHomeServer(browserStorage, true);
    return {
      storage: createHomeServerStorage(answer.copy, fetchFunction),
      isHomeServerMissing: false,
    };
  }
  return fallBackToBrowser(answer, browserStorage);
}

/**
 * The browser's storage, for an address that is not serving a home server's catalogue: silently when it answered as
 * another site would (and that is remembered), with the warning when it is a home server that did not answer.
 */
function fallBackToBrowser(
  answer: Exclude<ServerAnswer, { kind: "copy" }>,
  browserStorage: Storage,
): StartupChoice {
  const storage = createBrowserStorage(browserStorage);
  if (answer.kind === "notAHomeServer") {
    // Answered, but as another site would (a dev server, a static host): this origin is not a home server any more
    rememberOriginIsHomeServer(browserStorage, false);
    return { storage, isHomeServerMissing: false };
  }
  const wasHomeServer = browserStorage.getItem(HOME_SERVER_SEEN_KEY) === "true";
  return { storage, isHomeServerMissing: wasHomeServer };
}

/** Writes or removes the remembered fact; storage that refuses (private mode, a full quota) just means no memory. */
function rememberOriginIsHomeServer(
  browserStorage: Storage,
  isHomeServer: boolean,
): void {
  try {
    if (isHomeServer) browserStorage.setItem(HOME_SERVER_SEEN_KEY, "true");
    else browserStorage.removeItem(HOME_SERVER_SEEN_KEY);
  } catch {
    // Without the memory the only loss is the warning for a home server that is down
  }
}

const homeServerMissing = ref(false);

/** Whether the app is running on the browser's storage because the home server it was loaded from did not answer. */
export const isHomeServerMissing = readonly(homeServerMissing);

/**
 * Chooses the storage, installs the app's store on it, and has the store refresh whenever the page becomes visible
 * again or the network comes back, so a second device sees what the first changed and a failed save is retried.
 */
export async function startCatalogue(): Promise<void> {
  const { storage, isHomeServerMissing: isMissing } =
    await chooseCatalogueStorage(
      (input, init) => fetch(input, init),
      localStorage,
    );
  homeServerMissing.value = isMissing;
  const store = createCatalogueStoreOn(storage);
  installCatalogueStore(store);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void store.refresh();
  });
  window.addEventListener("online", () => void store.refresh());
}
