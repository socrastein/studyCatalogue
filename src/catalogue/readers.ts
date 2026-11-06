/**
 * Shape checks for data read from outside the app (localStorage, an imported file): each reader takes an `unknown`
 * value and either returns it as the expected type or throws a `ShapeError` saying where the data is wrong, e.g.
 * "study 3: year should be a whole number". serialization.ts builds the catalogue reader from these.
 */
import { isFacetId, type FacetValue } from "./facets";

/** Data that does not have the shape the catalogue expects. Its message is meant to be shown to the person. */
export class ShapeError extends Error {}

/**
 * The value as an object whose fields can be read.
 *
 * @param where What the value is, for the error message, e.g. "study 3".
 */
export function readRecord(
  value: unknown,
  where: string,
): Record<string, unknown> {
  const isObject =
    typeof value === "object" && value !== null && !Array.isArray(value);
  if (!isObject) throw new ShapeError(`${where} should be an object`);
  return value as Record<string, unknown>;
}

/**
 * The value as an array of items still to be checked.
 *
 * @param where What the value is, for the error message.
 */
export function readArray(value: unknown, where: string): unknown[] {
  if (!Array.isArray(value)) throw new ShapeError(`${where} should be a list`);
  return value;
}

/**
 * The value as a string.
 *
 * @param where What the value is, for the error message.
 */
export function readString(value: unknown, where: string): string {
  if (typeof value !== "string")
    throw new ShapeError(`${where} should be text`);
  return value;
}

/**
 * The value as a string, or null for a field that may be left empty.
 *
 * @param where What the value is, for the error message.
 */
export function readOptionalString(
  value: unknown,
  where: string,
): string | null {
  if (value === null) return null;
  return readString(value, where);
}

/**
 * The value as a whole number.
 *
 * @param where What the value is, for the error message.
 */
export function readWholeNumber(value: unknown, where: string): number {
  if (!Number.isInteger(value))
    throw new ShapeError(`${where} should be a whole number`);
  return value as number;
}

/**
 * The value as a list of strings.
 *
 * @param where What the value is, for the error message.
 */
export function readStringList(value: unknown, where: string): string[] {
  return readArray(value, where).map((item) =>
    readString(item, `${where} item`),
  );
}

/**
 * The value as one id from a facet's vocabulary.
 *
 * @param values The facet's vocabulary, e.g. `STUDY_DESIGNS`.
 * @param where What the value is, for the error message.
 * @returns The id, narrowed to that facet's id type.
 */
export function readFacetId<Values extends readonly FacetValue[]>(
  values: Values,
  value: unknown,
  where: string,
): Values[number]["id"] {
  const candidate = readString(value, where);
  if (!isFacetId(values, candidate))
    throw new ShapeError(`${where} has an unknown value "${candidate}"`);
  return candidate;
}

/**
 * The value as a list of ids from one facet's vocabulary.
 *
 * @param values The facet's vocabulary, e.g. `AGE_GROUPS`.
 * @param where What the value is, for the error message.
 */
export function readFacetIds<Values extends readonly FacetValue[]>(
  values: Values,
  value: unknown,
  where: string,
): Values[number]["id"][] {
  return readArray(value, where).map((item) =>
    readFacetId(values, item, where),
  );
}
