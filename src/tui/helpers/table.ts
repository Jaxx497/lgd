import type { Entry } from "../../api/models/entry";

export const ALL_COLUMNS = [
  "index",
  "ext",
  "title",
  "authors",
  "year",
  "size",
  "language",
  "pages",
  "publisher",
] as const;
export type Column = (typeof ALL_COLUMNS)[number];

export const DEFAULT_COLUMNS: Column[] = ["index", "ext", "title", "authors", "year", "size"];

const REQUIRED_COLUMNS: Column[] = ["index", "ext", "title"];
// Narrow terminals drop columns in this order until the title has room.
const DROP_ORDER: Column[] = ["publisher", "pages", "language", "size", "year", "authors"];
const RIGHT_ALIGNED = new Set<Column>(["index", "size", "pages"]);
const MIN_TITLE_WIDTH = 20;
export const COLUMN_GAP = 2;

export interface ColumnLayout {
  column: Column;
  width: number;
  alignRight: boolean;
}

const fixedWidth = (column: Column, rowWidth: number, indexWidth: number): number => {
  switch (column) {
    case "index": {
      return indexWidth;
    }
    case "ext":
    case "year": {
      return 4;
    }
    case "pages": {
      return 5;
    }
    case "size": {
      return 8;
    }
    case "language": {
      return 10;
    }
    case "authors": {
      return Math.max(10, Math.floor(rowWidth * 0.25));
    }
    case "publisher": {
      return Math.max(10, Math.floor(rowWidth * 0.15));
    }
    case "title": {
      return 0;
    }
  }
};

// Widths for the requested columns in `rowWidth` characters. The title takes what is left.
export function layoutColumns(
  requested: Column[],
  rowWidth: number,
  indexWidth: number
): ColumnLayout[] {
  const unique = [...new Set(requested)];
  let columns = [...REQUIRED_COLUMNS.filter((column) => !unique.includes(column)), ...unique];

  const titleWidth = () => {
    const others = columns
      .filter((column) => column !== "title")
      .reduce((sum, column) => sum + fixedWidth(column, rowWidth, indexWidth), 0);
    return rowWidth - others - COLUMN_GAP * (columns.length - 1);
  };

  for (const column of DROP_ORDER) {
    if (titleWidth() >= MIN_TITLE_WIDTH) {
      break;
    }
    columns = columns.filter((kept) => kept !== column);
  }

  return columns.map((column) => {
    let width = fixedWidth(column, rowWidth, indexWidth);
    if (column === "title") {
      width = Math.max(1, titleWidth());
    }
    return { column, width, alignRight: RIGHT_ALIGNED.has(column) };
  });
}

export function cellText(column: Column, entry: Entry, rowNumber: number): string {
  switch (column) {
    case "index": {
      return String(rowNumber);
    }
    case "ext": {
      return entry.extension;
    }
    case "year": {
      // the mirror's year is sometimes a full date ("2011 April 1")
      return /\d{4}/.exec(entry.year)?.[0] ?? entry.year;
    }
    default: {
      return entry[column];
    }
  }
}

// First visible row after moving the cursor: unchanged unless the cursor left the window.
export function scrollTopFor(
  previousTop: number,
  cursor: number,
  height: number,
  length: number
): number {
  let top = previousTop;
  if (cursor < top) {
    top = cursor;
  }
  if (cursor >= top + height) {
    top = cursor - height + 1;
  }
  return Math.max(0, Math.min(top, length - height));
}
