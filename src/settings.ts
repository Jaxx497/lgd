import { version } from "../package.json";

// ponytail: mirror list still comes from the original project's configuration branch; the
// user config `mirror` key is the fallback if it disappears.
export const CONFIGURATION_URL =
  "https://raw.githubusercontent.com/obsfx/libgen-downloader/configuration/config.v3.json";

// Used when the config above can't be fetched (e.g. old Android without current TLS roots).
export const FALLBACK_MIRRORS = [
  "libgen.li",
  "libgen.vg",
  "libgen.gl",
  "libgen.bz",
  "libgen.la",
].map((host) => ({ src: `https://${host}/`, type: "libgen-plus" as const }));

// A download that has received nothing this long after it started (page lookup + connecting)
// fails, freeing the queue. Once bytes flow, stalls are retried instead.
export const DOWNLOAD_CONNECT_TIMEOUT_MS = 10_000;

export const FAIL_REQ_ATTEMPT_COUNT = 5;
export const FAIL_REQ_ATTEMPT_DELAY_MS = 2000;
export const REQUEST_TIMEOUT_MS = 10_000;

export const SEARCH_PAGE_SIZE = 25;
// A search request takes as long for 25 rows as for 100 (the mirror accepts 25/50/100), so always
// fetch 100: the next pages then come from the cache. At most FETCH_CAP new requests per page turn.
export const FETCH_CHUNK_SIZE = 100;
export const FETCH_CAP = 3;

export const LIBGEN_USER_AGENT = `libgen-dl/${version}`;
export const SEARCH_MIN_CHAR = 3;
