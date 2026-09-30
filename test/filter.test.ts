import { describe, expect, it } from "vitest";
import type { Entry } from "../src/api/models/entry";
import { preferLanguage, usableResults } from "../src/api/filter";

const entry = (overrides: Partial<Entry>): Entry => ({
  id: "id",
  authors: "",
  title: "Book",
  publisher: "",
  year: "",
  pages: "",
  language: "",
  size: "",
  extension: "pdf",
  mirror: "/ads.php?md5=x",
  ...overrides,
});

describe("usableResults", () => {
  it("drops entries with no title, extension or mirror link", () => {
    const good = entry({});
    expect(
      usableResults(
        [good, entry({ title: "" }), entry({ extension: "" }), entry({ mirror: "" })],
        []
      )
    ).toEqual([good]);
  });

  it("keeps only the filtered extensions, ignoring case", () => {
    const pdf = entry({ extension: "PDF" });
    const epub = entry({ extension: "epub" });
    expect(usableResults([pdf, epub, entry({ extension: "cbr" })], ["pdf", "epub"])).toEqual([
      pdf,
      epub,
    ]);
  });
});

describe("preferLanguage", () => {
  it("lists the preferred language first, keeping order otherwise", () => {
    const [a, b, c] = [
      entry({ id: "a", language: "Russian" }),
      entry({ id: "b", language: "English, French" }),
      entry({ id: "c", language: "english" }),
    ];
    expect(preferLanguage([a, b, c], "English")).toEqual([b, c, a]);
    expect(preferLanguage([a, b, c], "")).toEqual([a, b, c]);
  });
});
