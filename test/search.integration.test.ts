import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LibgenPlusAdapter } from "../src/api/adapters/libgen-plus-adapter";
import type { Entry } from "../src/api/models/entry";
import Label from "../src/labels";
import { initialAppState } from "../src/tui/store/app";
import { initialBulkDownloadQueueState } from "../src/tui/store/bulk-download-queue";
import { initialCacheState } from "../src/tui/store/cache";
import { initialConfigState } from "../src/tui/store/config";
import { initialDownloadQueueState } from "../src/tui/store/download-queue";
import { useBoundStore } from "../src/tui/store";
import { LAYOUT_KEY } from "../src/tui/layouts/keys";

const BASE_URL = "https://libgen.example/";
const originalStoreState = useBoundStore.getState();

const entry: Entry = {
  id: "cached-entry",
  authors: "Example Author",
  title: "Cached Book",
  publisher: "Example Press",
  year: "2026",
  pages: "100",
  language: "English",
  size: "1 MB",
  extension: "epub",
  mirror: "/ads.php?md5=cached",
};

const searchResultHTML = `
  <table id="tablelibgen">
    <tbody>
      <tr>
        <td><a>Search Result</a></td>
        <td>Search Author</td>
        <td>Search Press</td>
        <td>2026</td>
        <td>English</td>
        <td>200</td>
        <td>2 MB</td>
        <td>pdf</td>
        <td><a href="/ads.php?md5=result">Mirror</a></td>
      </tr>
    </tbody>
  </table>
`;

beforeEach(() => {
  useBoundStore.setState(
    {
      ...originalStoreState,
      ...initialAppState,
      ...initialConfigState,
      ...initialCacheState,
      ...initialDownloadQueueState,
      ...initialBulkDownloadQueueState,
      CLIMode: true,
      mirror: { src: BASE_URL, type: "libgen-plus" },
      mirrors: [{ src: BASE_URL, type: "libgen-plus" }],
      mirrorAdapter: new LibgenPlusAdapter(BASE_URL),
      setWarningMessage: vi.fn(() => {}),
    },
    true
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  useBoundStore.setState(originalStoreState, true);
});

describe("search integration", () => {
  it("parses remote results, caches them, and reuses the cache", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(searchResultHTML));
    useBoundStore.setState({ searchValue: "typescript" });

    const firstResult = await useBoundStore.getState().search("typescript", 1, 25);
    const secondResult = await useBoundStore.getState().search("typescript", 1, 25);

    expect(firstResult.status).toBe("success");
    expect(firstResult).toMatchObject({
      entries: [
        {
          title: "Search Result",
          authors: "Search Author",
          mirror: "/ads.php?md5=result",
        },
      ],
    });
    expect(secondResult).toEqual(firstResult);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    if (firstResult.status !== "success") {
      throw new Error("Expected the initial search to succeed");
    }
    expect(
      useBoundStore.getState().entryCacheMap[
        "https://libgen.example/index.php?req=typescript&page=1&res=25"
      ]
    ).toEqual(firstResult.entries);
  });

  it("returns a connection error reported by the active mirror", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response('<div class="alert-danger">Database is unavailable</div>')
    );
    useBoundStore.setState({ searchValue: "typescript" });

    await expect(useBoundStore.getState().search("typescript", 1, 25)).resolves.toEqual({
      status: "connection_error",
      message: "Database is unavailable",
    });
  });

  it("submits a search and shows the first page", async () => {
    const search = vi.fn(async () => ({ status: "success" as const, entries: [entry] }));
    useBoundStore.setState({ searchValue: "typescript", search });

    await useBoundStore.getState().handleSearchSubmit();

    const state = useBoundStore.getState();
    expect(search).toHaveBeenCalledWith("typescript", 1, 25);
    expect(state.activeLayout).toBe(LAYOUT_KEY.RESULT_LIST_LAYOUT);
    expect(state.entries).toEqual([entry]);
    expect(state.isLoading).toBe(false);
    // one short chunk means the mirror has nothing more
    expect(state.nextPageStatus).toBe("unavailable");
  });

  it("reports an unrecoverable connection error when no fallback mirror exists", async () => {
    const search = vi.fn(async () => ({
      status: "connection_error" as const,
      message: "Active mirror failed",
    }));
    useBoundStore.setState({ searchValue: "typescript", search });

    await useBoundStore.getState().handleSearchSubmit();

    const state = useBoundStore.getState();
    expect(state.connectionError).toBe("Active mirror failed");
    expect(state.errorMessage).toBe(Label.ALL_MIRRORS_FAILED);
    expect(state.isLoading).toBe(false);
  });
});

// A mirror whose every chunk is full: `pdfEvery` rows in each chunk are pdf, the rest cbr.
const installChunkedMirror = (pdfEvery: number, lastChunk = Infinity) => {
  const search = vi.fn(async (query: string, chunk: number, chunkSize: number) => {
    let entries: Entry[] = [];
    if (chunk <= lastChunk) {
      entries = Array.from({ length: chunkSize }, (_, row) => ({
        ...entry,
        id: `${chunk}-${row}`,
        extension: ["cbr", "pdf"][Number(row % pdfEvery === 0)],
      }));
    }
    // cache like the real search does
    const state = useBoundStore.getState();
    state.setEntryCacheMap(state.mirrorAdapter!.getSearchURL(query, chunk, chunkSize), entries);
    return { status: "success" as const, entries };
  });
  useBoundStore.setState({ searchValue: "typescript", search });
  return search;
};

describe("paging with a filter", () => {
  it("fetches 100-row chunks until a 25-row page of matches is full", async () => {
    const search = installChunkedMirror(5); // 20 pdf per 100 rows
    useBoundStore.setState({ filter: ["pdf"] });

    await useBoundStore.getState().showPage(1);

    const state = useBoundStore.getState();
    expect(search.mock.calls.map((call) => call.slice(1))).toEqual([
      [1, 100],
      [2, 100],
    ]);
    expect(state.entries).toHaveLength(25);
    expect(state.entries.every((result) => result.extension === "pdf")).toBe(true);
    expect(state.nextPageStatus).toBe("ready");
  });

  it("stops after 3 new requests and marks the page as partial", async () => {
    const search = installChunkedMirror(50); // 2 pdf per 100 rows
    useBoundStore.setState({ filter: ["pdf"] });

    await useBoundStore.getState().showPage(1);

    expect(search).toHaveBeenCalledTimes(3);
    expect(useBoundStore.getState().entries).toHaveLength(6);
    expect(useBoundStore.getState().nextPageStatus).toBe("partial");
  });

  it("refills a partial page on ] instead of moving on", async () => {
    installChunkedMirror(50);
    useBoundStore.setState({ filter: ["pdf"] });
    await useBoundStore.getState().showPage(1);

    await useBoundStore.getState().nextPage();

    const state = useBoundStore.getState();
    expect(state.currentPage).toBe(1);
    expect(state.entries).toHaveLength(12);
  });

  it("marks the last page when the mirror runs out", async () => {
    installChunkedMirror(1, 1); // one full chunk of 25, then nothing
    await useBoundStore.getState().showPage(1);
    expect(useBoundStore.getState().nextPageStatus).toBe("ready");

    await useBoundStore.getState().nextPage();

    const state = useBoundStore.getState();
    expect(state.currentPage).toBe(1);
    expect(state.nextPageStatus).toBe("unavailable");
  });
});
