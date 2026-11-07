/**
 * The question a page is waiting on before something that cannot be undone, for the library's ConfirmDialog. The
 * library's dialog is mounted while a question is pending and reports the answer by event; this keeps the asking side
 * a plain `if (!(await confirmation.ask(...))) return;`, so each action reads top to bottom.
 *
 * Used by the edit-study, edit-tag and settings pages, each of which renders the dialog from it:
 *
 *   const { question: pendingQuestion, ask: confirm, answer } = useConfirmation();
 *   <ConfirmDialog v-if="pendingQuestion" v-bind="pendingQuestion" @confirm="answer(true)" @cancel="answer(false)" />
 */
import { shallowRef, type ShallowRef } from "vue";

/** What the dialog says: the props of the library's ConfirmDialog. */
export type ConfirmationQuestion = {
  /** e.g. "Delete this study?" */
  question: string;
  /** What answering yes will do, e.g. "It will be removed from the catalogue. This cannot be undone." */
  detail: string;
  /** The words on the button that goes ahead, naming the action: "Delete study", never "OK". */
  confirmLabel: string;
};

export type Confirmation = {
  /** The question being asked, or null while none is. */
  question: Readonly<ShallowRef<ConfirmationQuestion | null>>;
  ask: (question: ConfirmationQuestion) => Promise<boolean>;
  answer: (isConfirmed: boolean) => void;
};

/**
 * A confirmation for one page.
 *
 * @returns `ask` shows a question and resolves with the answer (true to go ahead); `answer` is called by the dialog's
 *   events and closes it.
 */
export function useConfirmation(): Confirmation {
  const question = shallowRef<ConfirmationQuestion | null>(null);
  // Resolves the promise of the question being asked; asking again before an answer settles the earlier one as "no"
  let settle: (isConfirmed: boolean) => void = () => {};

  function ask(newQuestion: ConfirmationQuestion): Promise<boolean> {
    settle(false);
    question.value = newQuestion;
    return new Promise((resolve) => {
      settle = resolve;
    });
  }

  function answer(isConfirmed: boolean): void {
    question.value = null;
    settle(isConfirmed);
    settle = () => {};
  }

  return { question, ask, answer };
}
