/**
 * The study search: what a study's search text holds, and whether it holds every word typed. This is the rule of the
 * website's Study Catalog (shared/studyCatalog/studySearch.ts), so both find the same studies: every typed word must
 * appear somewhere in the study's title, authors, journal, summary or topic names. The abstract and the year are not
 * searched. Case and accents do not matter ("Cote" finds "Côté"). filterStudies.ts uses it for the browse page.
 */
import { fullName } from "./citations/authorNames";
import type { Study } from "./study";
import type { Tag } from "./tags";
import { foldForMatching } from "./textMatching";

/**
 * Everything a search looks in for one study, folded for matching: its title, authors, journal, summary text and the
 * names of its topics.
 *
 * @param study The study to search.
 * @param tags Every tag in the catalogue, to find the names of the study's topics. Topic aliases are not searched.
 * @returns One text. Its fields are joined by line breaks, which no typed word contains, so a word cannot match
 *   across two fields.
 */
export function searchTextOf(study: Study, tags: readonly Tag[]): string {
  const topicNames = tags
    .filter((tag) => study.tagIds.includes(tag.id))
    .map((tag) => tag.name);
  // A study has no summary until one is drafted: its text is then empty, and the study is found by its other fields
  const summaryText = study.summary?.text ?? "";
  const parts = [
    study.title,
    ...study.authors.map(fullName),
    study.journal,
    summaryText,
    ...topicNames,
  ];
  return foldForMatching(parts.join("\n"));
}

/**
 * Whether a study's search text holds every word typed. Words are separated by any run of spaces; a word matches
 * where it appears inside a longer word too, so "pain" finds "painful".
 *
 * @param searchText A study's text from `searchTextOf`.
 * @param typed What was typed in the search box.
 * @returns true when every typed word is in the text. A blank search has no words, so it matches every study.
 */
export function matchesSearch(searchText: string, typed: string): boolean {
  const words = foldForMatching(typed)
    .split(/\s+/)
    .filter((word) => word !== "");
  return words.every((word) => searchText.includes(word));
}
