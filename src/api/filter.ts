import type { Entry } from "./models/entry";

// Entries with no title, no extension or no mirror link can't be shown or downloaded,
// so they are always dropped. `filter` is a list of extensions; empty means all.
export const usableResults = (entries: Entry[], filter: string[]): Entry[] =>
  entries.filter(
    (entry) =>
      entry.title &&
      entry.extension &&
      entry.mirror &&
      (filter.length === 0 || filter.includes(entry.extension.toLowerCase()))
  );

// Entries in the preferred language first, otherwise in their original order. Matches by
// substring because a file can list several ("English, French"). Empty preference = no change.
export const preferLanguage = (entries: Entry[], language: string): Entry[] => {
  const wanted = language.trim().toLowerCase();
  if (!wanted) {
    return entries;
  }
  const matches = (entry: Entry) => entry.language.toLowerCase().includes(wanted);
  return [
    ...entries.filter((entry) => matches(entry)),
    ...entries.filter((entry) => !matches(entry)),
  ];
};
