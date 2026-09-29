import { version } from "../package.json";

export const SCREEN_BASE_APP_WIDTH = 80;
export const SCREEN_PADDING = 5;
export const SCREEN_WIDTH_PERC = 95;

// ponytail: mirror list still comes from the original project's configuration branch; the
// user config `mirror` key is the fallback if it disappears.
export const CONFIGURATION_URL =
  "https://raw.githubusercontent.com/obsfx/libgen-downloader/configuration/config.v3.json";

export const FAIL_REQ_ATTEMPT_COUNT = 5;
export const FAIL_REQ_ATTEMPT_DELAY_MS = 2000;
export const REQUEST_TIMEOUT_MS = 10_000;

export const SEARCH_PAGE_SIZE = 25;

export const LIBGEN_USER_AGENT = `lgd/${version}`;
