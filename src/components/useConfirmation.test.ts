/**
 * Tests for useConfirmation: a question is pending until it is answered, and the answer reaches whoever asked.
 */
import { describe, expect, it } from "vitest";
import { useConfirmation, type ConfirmationQuestion } from "./useConfirmation";

const DELETE_QUESTION: ConfirmationQuestion = {
  question: "Delete this study?",
  detail: "This cannot be undone.",
  confirmLabel: "Delete Study",
};

describe("useConfirmation", () => {
  it("asks nothing until asked", () => {
    const confirmation = useConfirmation();
    expect(confirmation.question.value).toBeNull();
  });

  it("shows the question while waiting for an answer", () => {
    const confirmation = useConfirmation();
    void confirmation.ask(DELETE_QUESTION);
    expect(confirmation.question.value).toEqual(DELETE_QUESTION);
  });

  it("resolves true when confirmed, and closes the question", async () => {
    const confirmation = useConfirmation();
    const answer = confirmation.ask(DELETE_QUESTION);
    confirmation.answer(true);
    await expect(answer).resolves.toBe(true);
    expect(confirmation.question.value).toBeNull();
  });

  it("resolves false when cancelled", async () => {
    const confirmation = useConfirmation();
    const answer = confirmation.ask(DELETE_QUESTION);
    confirmation.answer(false);
    await expect(answer).resolves.toBe(false);
  });

  it("answers an unanswered question no when a new one is asked", async () => {
    const confirmation = useConfirmation();
    const firstAnswer = confirmation.ask(DELETE_QUESTION);
    const mergeQuestion = { ...DELETE_QUESTION, question: "Merge tags?" };
    void confirmation.ask(mergeQuestion);
    await expect(firstAnswer).resolves.toBe(false);
    expect(confirmation.question.value).toEqual(mergeQuestion);
  });
});
