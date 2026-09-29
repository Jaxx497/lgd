import { version } from "../package.json";

// ponytail: mirror list still comes from the original project's configuration branch; the
// user config `mirror` key is the fallback if it disappears.
export const CONFIGURATION_URL =
  "https://raw.githubusercontent.com/obsfx/libgen-downloader/configuration/config.v3.json";

export const FAIL_REQ_ATTEMPT_COUNT = 5;
export const FAIL_REQ_ATTEMPT_DELAY_MS = 2000;
export const REQUEST_TIMEOUT_MS = 10_000;

export const SEARCH_PAGE_SIZE = 25;
// With a filter, fetch bigger chunks (the mirror accepts 25/50/100), at most FETCH_CAP new
// requests per page turn.
export const FILTERED_CHUNK_SIZE = 100;
export const FETCH_CAP = 3;

export const LIBGEN_USER_AGENT = `lgd/${version}`;
export const SEARCH_MIN_CHAR = 3;
