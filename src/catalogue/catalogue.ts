/**
 * The catalogue: every study and every tag, the one document the app saves, exports and imports.
 */
import { seedTags } from "./seedTags";
import type { Study } from "./study";
import type { Tag } from "./tags";

export type Catalogue = {
  readonly studies: readonly Study[];
  readonly tags: readonly Tag[];
};

/**
 * The catalogue a first visit starts with: no studies, and the seed tags (see seedTags.ts).
 */
export function newCatalogue(): Catalogue {
  return { studies: [], tags: seedTags() };
}
