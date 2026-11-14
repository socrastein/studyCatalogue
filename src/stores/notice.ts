/**
 * A one-line confirmation shown on the next page after an action that navigates away, e.g. "Added "Title"." after
 * saving a new study. App.vue shows it in a status region, so screen readers announce it too, and clears it on the
 * navigation after that.
 */
import { readonly, ref } from "vue";

const message = ref("");

/** Whether the message was set for the page being navigated to and must survive that one navigation. */
let isWaitingForNextPage = false;

/**
 * Shows a message on the page the app is about to navigate to.
 *
 * @param text The confirmation, e.g. 'Added "Protein timing revisited".'
 */
export function showNoticeOnNextPage(text: string): void {
  message.value = text;
  isWaitingForNextPage = true;
}

/**
 * Shows a message on the page already showing, for an action that stays on it (approving a summary): it is read out at
 * once and cleared by the next navigation.
 *
 * @param text The confirmation, e.g. "Approved. 2 summaries left to review."
 */
export function showNoticeNow(text: string): void {
  message.value = text;
  isWaitingForNextPage = false;
}

/** Called by App.vue on every navigation: keeps a message through the navigation it was set for, then clears it. */
export function advanceNoticeOnNavigation(): void {
  if (isWaitingForNextPage) {
    isWaitingForNextPage = false;
    return;
  }
  message.value = "";
}

/** The current message, read-only; empty when there is none. */
export const noticeMessage = readonly(message);
