/**
 * Turning the catalogue into text and back: the one format used for localStorage, export and import. The text is
 * JSON with a schema version, so a later change to the format can recognize and migrate older data.
 *
 * Reading checks everything: the shape of every study and tag, that facet values come from their vocabularies, that
 * ids are unique, and that every tag a study or tag points to exists. Data that fails is rejected whole, with a
 * message saying what is wrong, rather than loaded in part.
 */
import type { Catalogue } from "./catalogue";
import {
  AGE_GROUPS,
  SEXES,
  STUDY_DESIGNS,
  SUBJECTS,
  TRAINING_STATUSES,
} from "./facets";
import {
  readArray,
  readFacetId,
  readFacetIds,
  readOptionalString,
  readRecord,
  readString,
  readStringList,
  readWholeNumber,
  ShapeError,
} from "./readers";
import type { Author, Study, StudyDetails } from "./study";
import { SUMMARY_SOURCES, type StudySummary } from "./summary";
import type { Tag } from "./tags";

/**
 * The version of the saved format. Raise it, and migrate older versions on read, whenever the format changes.
 *
 * Version 2 added a study's optional `summary` (summary.ts). Version 1 data has none, and reads exactly as it did.
 */
export const SCHEMA_VERSION = 2;

/** Every version this code can read: the current one, and the older ones that read as they are. */
const READABLE_VERSIONS: readonly number[] = [1, 2];

/** The result of reading saved or imported text: the catalogue, or why it could not be read. */
export type ParseResult =
  | { kind: "parsed"; catalogue: Catalogue }
  | { kind: "invalid"; problem: string };

/**
 * The catalogue as compact JSON text, with the schema version.
 *
 * @param catalogue The catalogue to save or export.
 */
export function serializeCatalogue(catalogue: Catalogue): string {
  return JSON.stringify({ schemaVersion: SCHEMA_VERSION, ...catalogue });
}

/**
 * The catalogue read back from text that `serializeCatalogue` wrote, checked in full.
 *
 * @param text Saved or imported text.
 * @returns "parsed" with the catalogue; "invalid" with a message for the person, e.g. "study 3: year should be a
 *   whole number", when the text is not a catalogue this version can read.
 */
export function parseCatalogue(text: string): ParseResult {
  try {
    const catalogue = readCatalogue(JSON.parse(text));
    return { kind: "parsed", catalogue };
  } catch (error) {
    return { kind: "invalid", problem: describeReadError(error) };
  }
}

/** The message for a failed read. Anything other than bad JSON or bad shape is a bug, so it is thrown on. */
function describeReadError(error: unknown): string {
  if (error instanceof SyntaxError) return "The data is not valid JSON.";
  if (error instanceof ShapeError)
    return `The data is not a readable catalogue: ${error.message}.`;
  throw error;
}

/** The catalogue from parsed JSON, after checking its version, every study and tag, and the links between them. */
function readCatalogue(value: unknown): Catalogue {
  const record = readRecord(value, "the catalogue");
  checkSchemaVersion(record.schemaVersion);
  const tags = readArray(record.tags, "tags").map(readTag);
  const studies = readArray(record.studies, "studies").map(readStudy);
  checkUniqueIds(tags, "tag");
  checkUniqueIds(studies, "study");
  checkTagReferences(studies, tags);
  return { studies, tags };
}

/** Throws unless the data is in a format this version can read. */
function checkSchemaVersion(version: unknown): void {
  if (typeof version === "number" && READABLE_VERSIONS.includes(version))
    return;
  if (typeof version === "number" && version > SCHEMA_VERSION) {
    throw new ShapeError(
      `it was saved by a newer version of the app (format ${version})`,
    );
  }
  throw new ShapeError(
    `its format version should be ${READABLE_VERSIONS.join(" or ")}`,
  );
}

/** One tag; `index` counts from 0, the message from 1. */
function readTag(value: unknown, index: number): Tag {
  const where = `tag ${index + 1}`;
  const record = readRecord(value, where);
  return {
    id: readString(record.id, `${where}: id`),
    name: readString(record.name, `${where}: name`),
    parentIds: readStringList(record.parentIds, `${where}: parentIds`),
    aliases: readStringList(record.aliases, `${where}: aliases`),
  };
}

/** One study; `index` counts from 0, the message from 1. */
function readStudy(value: unknown, index: number): Study {
  const where = `study ${index + 1}`;
  const record = readRecord(value, where);
  return {
    ...readBibliography(record, where),
    ...readFacets(record, where),
    ...readOptionalSummary(record, where),
    tagIds: readStringList(record.tagIds, `${where}: tagIds`),
    id: readString(record.id, `${where}: id`),
    createdAt: readString(record.createdAt, `${where}: createdAt`),
    updatedAt: readString(record.updatedAt, `${where}: updatedAt`),
  };
}

/** A study's summary when it has one, as a field to spread in; nothing for a study without (every version 1 study). */
function readOptionalSummary(
  record: Record<string, unknown>,
  where: string,
): { summary?: StudySummary } {
  if (record.summary === undefined) return {};
  return { summary: readSummary(record.summary, `${where}: summary`) };
}

/** A summary: its text, where it was written from, and when it was drafted and (if at all) approved. */
function readSummary(value: unknown, where: string): StudySummary {
  const record = readRecord(value, where);
  const source = readString(record.source, `${where}: source`);
  if (!SUMMARY_SOURCES.some((known) => known === source))
    throw new ShapeError(`${where}: source should be abstract or fullText`);
  return {
    text: readString(record.text, `${where}: text`),
    source: source as StudySummary["source"],
    generatedAt: readString(record.generatedAt, `${where}: generatedAt`),
    approvedAt: readNullableTimestamp(
      record.approvedAt,
      `${where}: approvedAt`,
    ),
    ...(record.sourceFile === undefined
      ? {}
      : { sourceFile: readString(record.sourceFile, `${where}: sourceFile`) }),
  };
}

/** A timestamp, or null for "not yet". */
function readNullableTimestamp(value: unknown, where: string): string | null {
  if (value === null) return null;
  return readString(value, where);
}

/** The fields a citation is built from. */
type Bibliography = Omit<StudyDetails, keyof Facets | "tagIds">;

/** A study's facet values (see facets.ts). */
type Facets = Pick<
  StudyDetails,
  "design" | "subjects" | "ageGroups" | "trainingStatuses" | "sexes"
>;

/** A study's bibliographic fields. */
function readBibliography(
  record: Record<string, unknown>,
  where: string,
): Bibliography {
  return {
    title: readString(record.title, `${where}: title`),
    authors: readAuthors(record.authors, `${where}: authors`),
    year: readWholeNumber(record.year, `${where}: year`),
    journal: readString(record.journal, `${where}: journal`),
    volume: readOptionalString(record.volume, `${where}: volume`),
    issue: readOptionalString(record.issue, `${where}: issue`),
    pages: readOptionalString(record.pages, `${where}: pages`),
    doi: readOptionalString(record.doi, `${where}: doi`),
    url: readOptionalString(record.url, `${where}: url`),
    abstract: readString(record.abstract, `${where}: abstract`),
  };
}

/** A study's facet values, each checked against its vocabulary. */
function readFacets(record: Record<string, unknown>, where: string): Facets {
  return {
    design: readFacetId(STUDY_DESIGNS, record.design, `${where}: design`),
    subjects: readFacetId(SUBJECTS, record.subjects, `${where}: subjects`),
    ageGroups: readFacetIds(
      AGE_GROUPS,
      record.ageGroups,
      `${where}: ageGroups`,
    ),
    trainingStatuses: readFacetIds(
      TRAINING_STATUSES,
      record.trainingStatuses,
      `${where}: trainingStatuses`,
    ),
    sexes: readFacetIds(SEXES, record.sexes, `${where}: sexes`),
  };
}

/** A study's author list, which must name at least one author. */
function readAuthors(value: unknown, where: string): Author[] {
  const authors = readArray(value, where).map((item) =>
    readAuthor(item, where),
  );
  if (authors.length === 0)
    throw new ShapeError(`${where} should name at least one author`);
  return authors;
}

/**
 * One author: an organization's name, or a person's family and given names. Authors saved before organizations
 * existed have no `kind`, and are people.
 */
function readAuthor(value: unknown, where: string): Author {
  const record = readRecord(value, `${where} item`);
  if (record.kind === "organization") {
    return {
      kind: "organization",
      name: readString(record.name, `${where}: organization name`),
    };
  }
  if (record.kind !== undefined && record.kind !== "person")
    throw new ShapeError(`${where}: unknown author kind`);
  return {
    kind: "person",
    family: readString(record.family, `${where}: family name`),
    given: readString(record.given, `${where}: given name`),
  };
}

/** Throws if two items share an id. */
function checkUniqueIds(items: { id: string }[], itemKind: string): void {
  const seen = new Set<string>();
  for (const { id } of items) {
    if (seen.has(id))
      throw new ShapeError(`two ${itemKind} entries share the id "${id}"`);
    seen.add(id);
  }
}

/** One tag id that a study or tag points to, and a description of what points to it, for the error message. */
type TagReference = { id: string; from: string };

/** Throws if a study's tag or a tag's parent is not one of the catalogue's tags. */
function checkTagReferences(
  studies: readonly Study[],
  tags: readonly Tag[],
): void {
  const tagIds = new Set(tags.map((tag) => tag.id));
  const references = [
    ...studies.flatMap(studyTagReferences),
    ...tags.flatMap(tagParentReferences),
  ];
  const missing = references.find((reference) => !tagIds.has(reference.id));
  if (missing === undefined) return;
  throw new ShapeError(
    `${missing.from} refers to a tag that does not exist ("${missing.id}")`,
  );
}

/** Each tag a study is tagged with. */
function studyTagReferences(study: Study): TagReference[] {
  const from = `study "${study.title}"`;
  return study.tagIds.map((id) => ({ id, from }));
}

/** Each parent a tag sits under. */
function tagParentReferences(tag: Tag): TagReference[] {
  const from = `tag "${tag.name}"`;
  return tag.parentIds.map((id) => ({ id, from }));
}
