/**
 * The studies whose draft summaries wait for Matt's review, as one reactive list for everything that shows them: the
 * header and phone menu (the link appears only while there are some) and the review page itself.
 */
import { computed, type ComputedRef } from "vue";
import type { Study } from "../catalogue/study";
import { studiesAwaitingReview } from "../catalogue/summary";
import { useCatalogue } from "./catalogueStore";

/**
 * The studies awaiting review, in the catalogue's order, kept up to date as summaries are approved, rejected or added.
 */
export function useSummariesAwaitingReview(): ComputedRef<readonly Study[]> {
  const catalogue = useCatalogue();
  return computed(() =>
    studiesAwaitingReview(catalogue.state.catalogue.studies),
  );
}
