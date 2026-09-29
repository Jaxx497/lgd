import { describe, expect, it } from "bun:test";
import { COLUMN_GAP, DEFAULT_COLUMNS, layoutColumns, scrollTopFor } from "../src/tui/helpers/table";

const names = (layout: ReturnType<typeof layoutColumns>) => layout.map((cell) => cell.column);
const totalWidth = (layout: ReturnType<typeof layoutColumns>) =>
  layout.reduce((sum, cell) => sum + cell.width, 0) + COLUMN_GAP * (layout.length - 1);

describe("layoutColumns", () => {
  it("fills the row exactly, giving the title the remainder", () => {
    const layout = layoutColumns(DEFAULT_COLUMNS, 120, 2);
    expect(names(layout)).toEqual(DEFAULT_COLUMNS);
    expect(totalWidth(layout)).toBe(120);
    expect(layout.find((cell) => cell.column === "ext")?.width).toBe(4);
    expect(layout.find((cell) => cell.column === "authors")?.width).toBe(30);
  });

  it("right-aligns numbers and sizes", () => {
    const aligned = layoutColumns(["index", "ext", "title", "size", "pages"], 150, 2)
      .filter((cell) => cell.alignRight)
      .map((cell) => cell.column);
    expect(aligned).toEqual(["index", "size", "pages"]);
  });

  it("drops size, then year, then authors as the terminal narrows", () => {
    expect(names(layoutColumns(DEFAULT_COLUMNS, 60, 2))).toEqual([
      "index",
      "ext",
      "title",
      "authors",
      "year",
    ]);
    expect(names(layoutColumns(DEFAULT_COLUMNS, 48, 2))).toEqual([
      "index",
      "ext",
      "title",
      "authors",
    ]);
    expect(names(layoutColumns(DEFAULT_COLUMNS, 40, 2))).toEqual(["index", "ext", "title"]);
  });

  it("drops extra columns before the defaults", () => {
    const layout = layoutColumns([...DEFAULT_COLUMNS, "publisher", "language"], 90, 2);
    expect(names(layout)).not.toContain("publisher");
    expect(names(layout)).toContain("authors");
  });

  it("always keeps index, ext and title, and ignores duplicates", () => {
    expect(names(layoutColumns(["authors", "authors"], 120, 2))).toEqual([
      "index",
      "ext",
      "title",
      "authors",
    ]);
  });
});

describe("scrollTopFor", () => {
  it("keeps the window still while the cursor stays inside it", () => {
    expect(scrollTopFor(0, 4, 10, 25)).toBe(0);
  });

  it("scrolls just enough to reveal the cursor", () => {
    expect(scrollTopFor(0, 12, 10, 25)).toBe(3);
    expect(scrollTopFor(10, 5, 10, 25)).toBe(5);
  });

  it("never scrolls past the end or before the start", () => {
    expect(scrollTopFor(20, 24, 10, 25)).toBe(15);
    expect(scrollTopFor(3, 0, 10, 5)).toBe(0);
  });
});
