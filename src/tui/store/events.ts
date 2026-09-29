import type { GetState, SetState } from "./index";
import { LAYOUT_KEY } from "../layouts/keys";
import Label from "../../labels";
import { Entry } from "../../api/models/entry";
import {
  FETCH_CAP,
  FILTERED_CHUNK_SIZE,
  SEARCH_MIN_CHAR,
  SEARCH_PAGE_SIZE,
} from "../../settings";
import { usableResults } from "../../api/filter";
import type { NextPageStatus } from "./app";
import { attempt } from "../../utilities";
import { getDocument } from "../../api/data/document";
import { removePartialDownloads } from "../../api/data/download";

export type SearchResult =
  | { status: "success"; entries: Entry[] }
  | { status: "connection_error"; message: string }
  | { status: "error"; message: string };

export type CollectResult =
  | { status: "success"; results: Entry[]; exhausted: boolean }
  | Exclude<SearchResult, { status: "success" }>;

export interface IEventActions {
  backToSearch: () => void;
  search: (query: string, chunk: number, chunkSize: number) => Promise<SearchResult>;
  collectResults: (needed: number) => Promise<CollectResult>;
  showPage: (page: number) => Promise<SearchResult["status"]>;
  handleSearchSubmit: () => Promise<void>;
  nextPage: () => Promise<void>;
  prevPage: () => Promise<void>;
  applyFilter: (filter: string[]) => void;
  requestQuit: () => void;
  handleExit: (exitCode?: number) => void;
}

export const createEventActionsSlice = (_set: SetState, get: GetState) => ({
  // New search screen with the previous query pre-filled.
  backToSearch: () => {
    const store = get();
    const { searchValue } = store;

    store.resetAppState();
    store.setSearchValue(searchValue);
    store.setActiveLayout(LAYOUT_KEY.SEARCH_LAYOUT);
  },

  // One mirror request (a "chunk" of `chunkSize` raw rows), cached by URL.
  search: async (query: string, chunk: number, chunkSize: number): Promise<SearchResult> => {
    const store = get();

    const searchURL = store.mirrorAdapter?.getSearchURL(query, chunk, chunkSize);
    if (!searchURL) {
      return { status: "error", message: `Couldn't construct search URL for "${query}"` };
    }

    const cachedEntries = store.entryCacheMap[searchURL];
    if (cachedEntries) {
      return { status: "success", entries: cachedEntries };
    }

    const pageDocumentResult = await attempt((signal) => getDocument(searchURL, signal));
    if (!pageDocumentResult) {
      return { status: "error", message: `Couldn't fetch the search page for "${query}"` };
    }

    const connectionError = get().mirrorAdapter?.detectConnectionError(pageDocumentResult);
    if (connectionError) {
      return { status: "connection_error", message: connectionError };
    }

    const entries = get().mirrorAdapter?.parseEntries(pageDocumentResult);
    if (!entries) {
      return { status: "error", message: `Couldn't parse the search page for "${query}"` };
    }

    store.setEntryCacheMap(searchURL, entries);
    return { status: "success", entries };
  },

  // Walks mirror chunks from the start (cached ones are free) collecting usable Entries that
  // match the filter, until `needed` are found, the mirror runs out, or FETCH_CAP new requests
  // were made. With a filter, chunks are bigger so sparse matches need fewer requests.
  collectResults: async (needed: number): Promise<CollectResult> => {
    const { searchValue, filter } = get();
    let chunkSize = SEARCH_PAGE_SIZE;
    if (filter.length > 0) {
      chunkSize = FILTERED_CHUNK_SIZE;
    }

    const results: Entry[] = [];
    const seen = new Set<string>(); // the same file can be listed in more than one chunk
    let newRequests = 0;
    for (let chunk = 1; ; chunk++) {
      const url = get().mirrorAdapter?.getSearchURL(searchValue, chunk, chunkSize) ?? "";
      const isCached = url in get().entryCacheMap;
      if (!isCached && newRequests >= FETCH_CAP) {
        return { status: "success", results, exhausted: false };
      }

      const result = await get().search(searchValue, chunk, chunkSize);
      if (result.status !== "success") {
        return result;
      }
      if (!isCached) {
        newRequests++;
      }

      for (const entry of usableResults(result.entries, filter)) {
        if (!seen.has(entry.id)) {
          seen.add(entry.id);
          results.push(entry);
        }
      }
      if (result.entries.length < chunkSize) {
        return { status: "success", results, exhausted: true };
      }
      if (results.length >= needed) {
        return { status: "success", results, exhausted: false };
      }
    }
  },

  // Shows the 25 Results of display page `page`. Leaves loading on for a connection error so
  // handleSearchSubmit can try other mirrors.
  showPage: async (page: number) => {
    const store = get();
    store.setIsLoading(true);
    store.setLoaderMessage(Label.GETTING_RESULTS);

    const collected = await store.collectResults(page * SEARCH_PAGE_SIZE);
    if (collected.status === "connection_error") {
      store.setConnectionError(collected.message);
      return collected.status;
    }

    store.setIsLoading(false);
    if (collected.status === "error") {
      store.setWarningMessage(collected.message);
      return collected.status;
    }

    const { results, exhausted } = collected;
    const entries = results.slice((page - 1) * SEARCH_PAGE_SIZE, page * SEARCH_PAGE_SIZE);

    if (entries.length === 0 && page > store.currentPage) {
      if (exhausted) {
        store.setNextPageStatus("unavailable");
        store.setWarningMessage("No more results");
      } else {
        store.setWarningMessage("No more matches found yet, press ] to keep looking");
      }
      return "success";
    }

    let nextPageStatus: NextPageStatus = "ready";
    if (exhausted && results.length <= page * SEARCH_PAGE_SIZE) {
      nextPageStatus = "unavailable";
    } else if (entries.length < SEARCH_PAGE_SIZE) {
      nextPageStatus = "partial";
    }

    if (page !== store.currentPage) {
      store.setCursor(0);
    }
    store.setCurrentPage(page);
    store.setEntries(entries);
    store.setNextPageStatus(nextPageStatus);
    return "success";
  },

  handleSearchSubmit: async () => {
    const store = get();

    if (store.searchValue.length < SEARCH_MIN_CHAR) {
      return;
    }

    store.setActiveLayout(LAYOUT_KEY.RESULT_LIST_LAYOUT);

    const status = await store.showPage(1);
    if (status !== "connection_error") {
      return;
    }

    const otherMirrors = store.mirrors.filter((m) => m.src !== store.mirror?.src);
    if (otherMirrors.length === 0) {
      store.setIsLoading(false);
      store.setErrorMessage(Label.ALL_MIRRORS_FAILED);
      return;
    }

    // Shown by the loading skeleton while other mirrors are tried
    store.setMirrorCheckStates(
      otherMirrors.map((m) => ({ src: m.src, status: "pending" as const }))
    );

    const switched = await store.switchMirror((mirrorSource, mirrorStatus) => {
      const currentStates = get().mirrorCheckStates.map((s) => {
        if (s.src === mirrorSource) {
          return { ...s, status: mirrorStatus };
        }
        return s;
      });
      get().setMirrorCheckStates(currentStates);
    });

    store.setConnectionError(undefined);
    store.setMirrorCheckStates([]);

    if (!switched || (await get().showPage(1)) === "connection_error") {
      store.setIsLoading(false);
      store.setErrorMessage(Label.ALL_MIRRORS_FAILED);
    }
  },

  // A short page (the fetch cap was hit) is refilled first; otherwise go to the next page.
  nextPage: async () => {
    const store = get();
    if (store.nextPageStatus === "unavailable") {
      return;
    }

    let page = store.currentPage + 1;
    if (store.nextPageStatus === "partial") {
      page = store.currentPage;
    }
    await store.showPage(page);
  },

  prevPage: async () => {
    const store = get();
    if (store.currentPage > 1) {
      await store.showPage(store.currentPage - 1);
    }
  },

  applyFilter: (filter: string[]) => {
    const store = get();
    store.setFilter(filter);
    if (store.activeLayout === LAYOUT_KEY.RESULT_LIST_LAYOUT) {
      store.setCurrentPage(1);
      store.setCursor(0);
      store.showPage(1);
    }
  },

  // `q` and Ctrl-c both land here. Asks first while anything is downloading or queued;
  // a second request while the prompt is showing quits.
  requestQuit: () => {
    const store = get();
    if (store.inDownloadQueueEntryIds.length === 0 || store.quitPromptVisible) {
      store.handleExit();
      return;
    }
    store.setQuitPromptVisible(true);
  },
  handleExit: (exitCode = 0) => {
    removePartialDownloads();
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(exitCode);
  },
});
