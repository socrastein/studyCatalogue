/**
 * Tests for the home server storage: ordered saves, the 409 merge, retry while the server is away, and refreshing.
 * Time is faked, so the pause before saving and the retry delay pass instantly.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newCatalogue } from "../catalogue/catalogue";
import { createStudy } from "../catalogue/study";
import { exampleStudyDetails } from "../catalogue/testFixtures";
import type { SaveEvents } from "./catalogueStorage";
import { createFakeHomeServer } from "./fakeHomeServer";
import {
  createHomeServerStorage,
  DEFAULT_TIMING,
  MERGED_NOTICE,
  REFRESHED_NOTICE,
} from "./homeServerStorage";

/** A record of what storage told the store. */
function recordingEvents() {
  const problems: (string | null)[] = [];
  const adopted: { titles: string[]; notice: string | null }[] = [];
  const events: SaveEvents = {
    reportSaveProblem: (message) => problems.push(message),
    adoptCatalogue: (catalogue, notice) =>
      adopted.push({
        titles: catalogue.studies.map((study) => study.title),
        notice,
      }),
  };
  return { events, problems, adopted };
}

/** A catalogue of the seed tags and one study per title. */
function catalogueOf(...titles: string[]) {
  const studies = titles.map((title) =>
    createStudy(exampleStudyDetails({ title, doi: `10.1/${title}` })),
  );
  return { ...newCatalogue(), studies };
}

/** Lets the pause before saving pass, and the saves it starts finish. */
async function letSavesHappen(): Promise<void> {
  await vi.advanceTimersByTimeAsync(
    DEFAULT_TIMING.pauseBeforeSavingMilliseconds,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("saving", () => {
  it("sends the catalogue with the revision it started from and clears the problem", async () => {
    const server = createFakeHomeServer();
    const storage = createHomeServerStorage(server.copy, server.fetch);
    const { events, problems } = recordingEvents();
    const catalogue = catalogueOf("One");

    storage.save(catalogue, events);
    await letSavesHappen();

    expect(server.copy).toEqual({ revision: 1, catalogue });
    expect(problems).toEqual([null]);
  });

  it("turns a burst of edits into one save of the newest catalogue", async () => {
    const server = createFakeHomeServer();
    const storage = createHomeServerStorage(server.copy, server.fetch);
    const { events } = recordingEvents();

    storage.save(catalogueOf("A"), events);
    storage.save(catalogueOf("A", "B"), events);
    const newest = catalogueOf("A", "B", "C");
    storage.save(newest, events);
    await letSavesHappen();

    expect(server.saves).toEqual([{ baseRevision: 0, status: 200 }]);
    expect(server.copy.catalogue).toEqual(newest);
  });

  it("saves in order, one at a time, when an edit arrives while a save is on its way", async () => {
    const server = createFakeHomeServer();
    const storage = createHomeServerStorage(server.copy, server.fetch);
    const { events } = recordingEvents();
    const second = catalogueOf("First", "Second");

    storage.save(catalogueOf("First"), events);
    await vi.advanceTimersByTimeAsync(
      DEFAULT_TIMING.pauseBeforeSavingMilliseconds,
    );
    storage.save(second, events);
    await letSavesHappen();

    expect(server.saves.map((save) => save.baseRevision)).toEqual([0, 1]);
    expect(server.copy.catalogue).toEqual(second);
  });
});

describe("a conflict with another device's save", () => {
  it("merges the server's copy with ours, tells the person, and saves the merge", async () => {
    const server = createFakeHomeServer();
    const storage = createHomeServerStorage(server.copy, server.fetch);
    const { events, adopted } = recordingEvents();
    server.saveFromAnotherDevice(catalogueOf("From the laptop"));

    storage.save(catalogueOf("From the PC"), events);
    await letSavesHappen();

    expect(server.saves).toEqual([
      { baseRevision: 0, status: 409 },
      { baseRevision: 1, status: 200 },
    ]);
    const titles = server.copy.catalogue.studies.map((study) => study.title);
    expect(titles.sort()).toEqual(["From the PC", "From the laptop"]);
    expect(adopted).toHaveLength(1);
    expect(adopted[0]?.notice).toBe(MERGED_NOTICE);
    expect(adopted[0]?.titles.sort()).toEqual([
      "From the PC",
      "From the laptop",
    ]);
  });

  it("stays silent when the other device's copy held nothing new", async () => {
    const server = createFakeHomeServer();
    const storage = createHomeServerStorage(server.copy, server.fetch);
    const { events, adopted } = recordingEvents();
    // Another device saved, but only what we also have: the new catalogue itself
    server.saveFromAnotherDevice(newCatalogue());

    storage.save(catalogueOf("Ours"), events);
    await letSavesHappen();

    expect(adopted[0]?.notice).toBeNull();
    expect(server.copy.catalogue.studies).toHaveLength(1);
  });
});

describe("a server that cannot be reached", () => {
  it("keeps the changes, warns, retries, and saves them once it is back", async () => {
    const server = createFakeHomeServer();
    server.isOffline = true;
    const storage = createHomeServerStorage(server.copy, server.fetch);
    const { events, problems } = recordingEvents();
    const catalogue = catalogueOf("Kept");

    storage.save(catalogue, events);
    await letSavesHappen();
    expect(problems.at(-1)).toContain("have not reached the home server");
    expect(server.copy.revision).toBe(0);

    await vi.advanceTimersByTimeAsync(
      DEFAULT_TIMING.retryAfterFailureMilliseconds,
    );
    expect(problems.at(-1)).toContain("have not reached the home server");

    server.isOffline = false;
    await vi.advanceTimersByTimeAsync(
      DEFAULT_TIMING.retryAfterFailureMilliseconds,
    );
    expect(server.copy).toEqual({ revision: 1, catalogue });
    expect(problems.at(-1)).toBeNull();
  });

  it("saves the newest catalogue after an outage, not the one that failed", async () => {
    const server = createFakeHomeServer();
    server.isOffline = true;
    const storage = createHomeServerStorage(server.copy, server.fetch);
    const { events } = recordingEvents();

    storage.save(catalogueOf("Old"), events);
    await letSavesHappen();
    const newest = catalogueOf("Old", "New");
    storage.save(newest, events);
    server.isOffline = false;
    await letSavesHappen();

    expect(server.copy.catalogue).toEqual(newest);
  });

  it("retries at once when the page is shown again", async () => {
    const server = createFakeHomeServer();
    server.isOffline = true;
    const storage = createHomeServerStorage(server.copy, server.fetch);
    const { events } = recordingEvents();
    storage.save(catalogueOf("Kept"), events);
    await letSavesHappen();

    server.isOffline = false;
    await storage.refresh(events);
    await vi.advanceTimersByTimeAsync(0);

    expect(server.copy.revision).toBe(1);
  });
});

describe("refreshing", () => {
  it("adopts a newer server copy and says another device changed it", async () => {
    const server = createFakeHomeServer();
    const storage = createHomeServerStorage(server.copy, server.fetch);
    const { events, adopted } = recordingEvents();
    server.saveFromAnotherDevice(catalogueOf("From the PC"));

    await storage.refresh(events);

    expect(adopted).toEqual([
      { titles: ["From the PC"], notice: REFRESHED_NOTICE },
    ]);
  });

  it("leaves things alone when the server's copy is the one we know", async () => {
    const server = createFakeHomeServer();
    const storage = createHomeServerStorage(server.copy, server.fetch);
    const { events, adopted } = recordingEvents();
    await storage.refresh(events);
    expect(adopted).toEqual([]);
  });

  it("does not replace changes that are waiting to be saved", async () => {
    const server = createFakeHomeServer();
    const storage = createHomeServerStorage(server.copy, server.fetch);
    const { events, adopted } = recordingEvents();
    server.saveFromAnotherDevice(catalogueOf("Theirs"));
    storage.save(catalogueOf("Ours"), events);

    await storage.refresh(events);

    expect(adopted).toEqual([]);
  });

  it("does not replace an edit that was made and fully saved while the read was on its way", async () => {
    const server = createFakeHomeServer();
    // The read is answered from the server's copy at the moment it is sent, but arrives only when released
    let releaseRead: () => void = () => {};
    const slowRead = new Promise<void>((resolve) => (releaseRead = resolve));
    const fetchWithSlowRead: typeof server.fetch = async (input, init) => {
      const answer = await server.fetch(input, init);
      if (init?.method !== "PUT") await slowRead;
      return answer;
    };
    const storage = createHomeServerStorage(server.copy, fetchWithSlowRead);
    const { events, adopted } = recordingEvents();

    const refreshing = storage.refresh(events);
    storage.save(catalogueOf("Typed during the read"), events);
    await letSavesHappen();
    releaseRead();
    await refreshing;

    // Without the check the page would go back to the empty copy the read saw, hiding a study that is on the server
    expect(server.copy.revision).toBe(1);
    expect(adopted).toEqual([]);
  });

  it("ignores an unreachable server", async () => {
    const server = createFakeHomeServer();
    const storage = createHomeServerStorage(server.copy, server.fetch);
    const { events, adopted } = recordingEvents();
    server.isOffline = true;
    await storage.refresh(events);
    expect(adopted).toEqual([]);
  });
});

describe("loading", () => {
  it("returns the catalogue the server held at startup", () => {
    const catalogue = catalogueOf("Held");
    const server = createFakeHomeServer(catalogue, 4);
    const storage = createHomeServerStorage(server.copy, server.fetch);
    expect(storage.load()).toEqual({ kind: "loaded", catalogue });
    expect(storage.location).toBe("homeServer");
  });
});
