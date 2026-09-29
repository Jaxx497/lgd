import { describe, expect, it } from "bun:test";
import type { Entry } from "../src/api/models/entry";
import { usableResults } from "../src/api/filter";

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
