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
