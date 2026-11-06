/**
 * Tests for the random ids given to studies and tags.
 */
import { describe, expect, it } from "vitest";
import { createId } from "./ids";

describe("createId", () => {
  it("is 16 lowercase hex characters", () => {
    expect(createId()).toMatch(/^[0-9a-f]{16}$/);
  });

  it("differs on every call", () => {
    const ids = Array.from({ length: 1000 }, createId);
    expect(new Set(ids).size).toBe(1000);
  });
});
