/**
 * Choosing where the catalogue lives, once, before the app mounts (so the first thing drawn is the real catalogue,
 * never an empty one). The app asks its own origin for `/api/catalogue`: a well-formed answer means the home server
 * (server/) is serving the app, so the catalogue lives there; anything else (a dev server, a static host, no
 * answer) means this browser's localStorage, exactly as before.
 */
import { createBrowserStorage } from "./browserStorage";
import {
  createCatalogueStoreOn,
  installCatalogueStore,
} from "./catalogueStore";
import type { CatalogueStorage } from "./catalogueStorage";
import { readServerCopy, type FetchFunction } from "./homeServerClient";
import { createHomeServerStorage } from "./homeServerStorage";

/**
 * The storage to use: the home server's when it answers, otherwise the browser's.
 *
 * @param fetchFunction The browser's `fetch`; tests pass a fake.
 * @param browserStorage The browser's localStorage; tests pass a stand-in.
 */
export async function chooseCatalogueStorage(
  fetchFunction: FetchFunction,
  browserStorage: Storage,
): Promise<CatalogueStorage> {
  const serverCopy = await readServerCopy(fetchFunction);
  if (serverCopy === null) return createBrowserStorage(browserStorage);
  return createHomeServerStorage(serverCopy, fetchFunction);
}

/**
 * Chooses the storage, installs the app's store on it, and has the store refresh whenever the page becomes visible
 * again or the network comes back, so a second device sees what the first changed and a failed save is retried.
 */
export async function startCatalogue(): Promise<void> {
  const storage = await chooseCatalogueStorage(
    (input, init) => fetch(input, init),
    localStorage,
  );
  const store = createCatalogueStoreOn(storage);
  installCatalogueStore(store);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void store.refresh();
  });
  window.addEventListener("online", () => void store.refresh());
}
