# lgd: improvement plan

Personal fork of [obsfx/libgen-downloader](https://github.com/obsfx/libgen-downloader) by Ömercan Balandı, renamed `lgd` (see S0b). Vocabulary lives in `CONTEXT.md`. Each step below is one commit. After every step run `bun run typecheck && bun run lint && bun test`.

## 1. Steps at a glance

| ID | Step | Depends on | Status |
|----|------|-----------|--------|
| S0 | Ponytail cleanup of existing code | none | done |
| S0b | Rename to `lgd`, version 1.0.0, keep attribution | S0 | done |
| S1 | Never overwrite files (`name(1).ext`) | none | done |
| S2 | Remove interactive bulk selection | none | done |
| S3 | Quit guard (`q` / `Ctrl-c`) | none | done |
| S4 | List rework: no expansion, hotkeys, one-line header, full-screen table, columns | S2, S3 | done |
| S5 | User config file | none (S4 uses its `columns`) | done |
| S6 | Filetype filter + drop bad results | S4, S5 | done |
| S7 | Downloads panel (`t`) | S4 | todo |
| S8 | Core logic review and refactor | S1–S7 | todo |

Your original six goals map to: (1) filetype filter → S6, (2) more screen → S4, (3) back-navigation → S4, (4) formatting/columns → S4 + S5, (5) navigation → S4, (6) dependencies → S0 + S2.

## 2. Current behaviour (why these steps exist)
- The result list is a rotating window over `listItems` (`src/utilities.ts`), with Search/Next/Prev/Bulk/Exit rows mixed into it and the active row pinned at window slot 3. Enter expands an entry into an inline option list.
- Sizes are hardcoded: `RESULT_LIST_LENGTH=12`, `RESULT_LIST_ACTIVE_LIST_INDEX=3` (`src/constants.ts`); width capped at `SCREEN_BASE_APP_WIDTH=80` (`src/settings.ts`, used by `src/tui/components/app-container.tsx`).
- Rows show only extension and title. `Entry` already has authors, year, size, language, pages.
- `Ctrl-c` exits immediately (Ink default), bypassing the only downloads-in-progress guard, which lives on the Exit row.
- `downloadFile` (`src/api/data/download.ts`) writes to `./<name>` and silently overwrites existing files.

## 3. Step details

### S0. Ponytail cleanup (done, uncommitted)
- Removed `react-devtools`, five unused `Label` entries, seven unused `Option` members.
- Verified: typecheck, lint, 23 tests pass. `order` on options is used by exit layouts and was kept.

### S0b. Rename to `lgd`, version 1.0.0
- **Rename:** package `name` and `bin` → `lgd`; version → `1.0.0` (`package.json` is the single source; `APP_VERSION` and the User-Agent read it). User-Agent becomes `lgd/1.0.0` (checked: libgen.li search accepts it; the download request path should be smoke-tested once, since a mirror could filter agents).
- **CLI text:** usage/help/examples in `src/cli/index.ts` say `lgd`. Standalone binary names become `lgd-<os>-<arch>` (`package.json` `compile:*` scripts and `.github/workflows/release.yml` artifact names).
- **Attribution (kept):**
  - `LICENSE` (WTFPL) is left unchanged, original copyright line included.
  - `package.json`: `author` stays the original author; add `contributors` with Jaxx497; `description` says it is a fork; `repository`/`homepage` point to this fork (`origin` is `Jaxx497/libgen-downloader`).
  - `README.md`: retitled `lgd`, opens with "Fork of libgen-downloader by Ömercan Balandı", links to the original repo, and keeps the original's history/credits section; install text updated to this fork (drop the `npm i -g libgen-downloader` line unless publishing).
- **Left pointing at the original on purpose:** `CONFIGURATION_URL` in `src/settings.ts` (the remote mirror list, `obsfx/libgen-downloader` `configuration` branch, currently reachable). It is a runtime dependency on the original repo; the `mirror` config key (S5) is the fallback if it ever disappears.
- **Decided:** no workflow publishes to npm; `"private": true` set and npm install lines removed from README and release notes. The update notice in the header was removed here too (it compared against the original project's version).
- Config directory: `~/.config/lgd/` (see S5).
- Files: `package.json`, `bun.lock` (name only), `src/settings.ts`, `src/cli/index.ts`, `README.md`, `.github/workflows/release.yml`, `.npmignore` if needed.
- Done when: `bun run build` and `bun run compile:linux-x64` produce `lgd` binaries; `lgd --help` shows the new name; grep for `libgen-downloader` finds only attribution links, the config URL, and the CHANGELOG-style history in the README.

### S1. Never overwrite files
- Change: in `downloadFile`, open the target with flag `wx` (fail if exists) in a loop: `name.ext`, `name(1).ext`, `name(2).ext`. Suffix goes before the extension; names without an extension get the suffix at the end.
- Applies to TUI and CLI (`-d`, `-b`) since they share `downloadFile`. Returned `path`/`filename` must be the final name.
- Files: `src/api/data/download.ts`, `test/download.test.ts`.
- Done when: tests cover existing file → `(1)`, existing `(1)` → `(2)`, no-extension name, 128-char truncation still keeps the extension and fits the suffix.
- Note for S5: path becomes `<downloadDir>/<name>` there (`downloadFile` now takes `directory`).
- **Done, plus:** the mirror's filename goes through `path.basename` (no `../` escape); a failed download deletes its partial file; long names are cut from the end instead of the start (the old code produced names like `ies (New York N.Y.) 1] Sun Tzu…`). Smoke-tested a real `-d` twice with User-Agent `lgd/1.0.0`: second run saved `…(1).epub`.

### S2. Remove interactive bulk selection
- Remove: Tab toggle and ✓ marks, bulk count in header, "Start Bulk Download" row, `bulk-download-before-exit` layout, bulk option in `detail-entry-options.tsx`, related `Label`/`Option`/enum entries, `bulkDownloadSelectedEntries` and add/remove actions, `object-hash` and `@types/object-hash`.
- Also remove: the auto-written `libgen_downloader_md5_list_<timestamp>.txt` after a run (`src/api/data/file.ts`, its call in `bulk-download-queue.ts`, the `createdMD5ListFileName` state and its message in `src/tui/layouts/bulk-download/index.tsx`).
- Keep: `store/bulk-download-queue.ts` (minus selection state) and the `bulk-download` layout, because CLI `-b` uses `startBulkDownloadInCLI`.
- Files: `src/tui/store/bulk-download-queue.ts`, `src/tui/layouts/bulk-download-before-exit/`, `src/tui/layouts/detail/detail-entry-options.tsx`, `src/tui/layouts/result-list/result-list-item-entry.tsx`, `src/tui/components/result-list-info.tsx`, `src/labels.ts`, `src/options.ts`, `package.json`, `bun.lock`, `test/queue.integration.test.ts`, `test/search.integration.test.ts`, `README.md`.
- Done when: `-b` still works (test), no `object-hash` in tree, `bun run build` passes.
- **Done.** Verified with a real `-b` run: file downloaded, no MD5 list written. `-d` did write the list before (confirmed in S1 smoke test); it no longer does. The five per-item store handlers now share one `updateItem` helper.

### S3. Quit guard
- Change: one `requestQuit()` used by both `q` and `Ctrl-c`. Render Ink with `exitOnCtrlC: false`; a global input handler calls `requestQuit()` on `q` and on `Ctrl-c`.
- Behaviour: nothing active or queued → exit immediately. Otherwise show an inline line `⚠ 1 downloading, 2 queued. Quit anyway? [y/N]`; `y`, `q` or `Ctrl-c` again quits; anything else dismisses.
- `q` is ignored while a text input has focus (search box, filter prompt); `Esc` backs out of those.
- Also handle `SIGTERM` (plain exit). CLI modes (`-d`, `-b`, `-u`) are unaffected.
- Replaces `download-queue-before-exit` layout and the Exit row's guard.
- Files: `src/tui/app.tsx`, `src/tui/index.tsx`, `src/tui/store/events.ts`, `src/tui/layouts/download-queue-before-exit/`, `src/tui/layouts/index.tsx`, `src/tui/layouts/keys.ts`.
- **Done.** `QuitGuard` (`src/tui/components/quit-guard.tsx`) holds the global keys and the confirm line. Quitting deletes any file still being written (`removePartialDownloads`). CLI `-b`/`-d` keep immediate Ctrl-c. `SIGTERM` needed no code: Ink already restores the terminal via `signal-exit`.
- **Bug fixed along the way:** `iterateQueue` only released an entry from `inDownloadQueueEntryIds` when the file transfer itself failed; earlier failures (no mirror page, no link) left it stuck, so the quit prompt would count a phantom download and the entry could never be retried.
- **For S4:** Ink sends every key to every `useInput`, so the key that dismisses the prompt also reaches the list. The S4 key handlers must ignore input while `quitPromptVisible`.

### S4. List rework
Goal: one plain scrolling table, no option rows, no expansion, hotkeys for everything.

**Header (one line)**: `libgen.li · Results for "art of war" · page 2 · next ▸ · pdf,epub`
- Shows the mirror, the query, page state, and the active filter. No app name, version, GitHub link, or update check (remove the `latestVersion` display and its fetch field). No bulk-queue count.
- On the search screen the header is just the mirror.
- Page state text: `next ▸` (more available), `] find more` (short filtered page), `last page`.

**Body**: rows fill the terminal (`stdout.rows` minus header, status/panel, footer, border). Width is `stdout.columns` minus a small margin (remove the 80-column cap). Fix `use-stdout-dimensions.tsx` initial rows bug. Page size stays 25; the table scrolls inside it. Below ~40×10, rows show only index, extension, title.

**Row format** (padStart/padEnd, `…` truncation, no new dependency):
```
 ▸  12  pdf   The Art of War                      Sun Tzu            2005  1.2 MB
   ##  ext4   title (flex)                        author (~25%)      year  size
```
- Index: right-aligned to the widest index on the page; counts visible rows 1..N.
- Extension: fixed 4 columns. Title: remainder. Author ~25%, year 4, size 8.
- Columns come from config `columns` (S5); default `index, ext, title, authors, year, size`. `index`, `ext`, `title` are always kept. On narrow terminals drop extras first, then size → year → authors.
- Per-row download status (existing `DownloadStatusAndProgress`) stays inline.

**Footer**: one-line key hints, truncated to width. Number-jump buffer shows as `:12`.

**Keys** (list view):

| Key | Action |
|---|---|
| `j` / `↓`, `k` / `↑` | move cursor (no wraparound) |
| `g` / `G` | first / last row |
| `Ctrl-d` / `Ctrl-u`, `PgDn` / `PgUp` | half page / page |
| `<n>` then `Enter` (or `<n>G`) | jump to row n; buffer clears after ~1 s or on `Esc` |
| `d` / `Enter` | download highlighted Entry |
| `i` / `l` / `→` | open Info |
| `]` or `n` / `[` or `p` | next / previous page |
| `/` or `Esc` | restart the search (search screen, previous query pre-filled) |
| `f` | edit filter (S6) |
| `t` | Downloads panel (S7) |
| `?` | help overlay listing these keys |
| `q` / `Ctrl-c` | quit (S3) |
| `h` | nothing on the list |

- Info view: `h` / `←` / `Esc` back, `d` / `Enter` download.
- The `d` handler must ignore `Ctrl-d` (Ink reports it as input `d` with `key.ctrl`).
- `Tab` is unbound.
- Pressing `d`/`Enter` on an Entry already queued or downloading is ignored. After it finishes, pressing again downloads `name(1).ext` (S1); the ✓ tells the user the file exists.

**Remove**: `Label.TURN_BACK_TO_THE_LIST`, `ResultListEntryOption`, `anyEntryExpanded`, `activeExpandedListLength`, `result-list-item-option.tsx`, `getRenderedListItems`, `constructListItems` option rows, `NextPageStatus` labels, `handleTurnBackToTheListOption`, `RESULT_LIST_*` constants. Cursor and scroll offset become plain state (`cursor`, `scrollTop`).

**Files**: `src/tui/layouts/result-list/*`, `src/tui/layouts/detail/*`, `src/tui/layouts/search/*`, `src/tui/hooks/use-scrollable-list-controls.tsx`, `src/tui/hooks/use-stdout-dimensions.tsx`, `src/tui/components/app-header.tsx`, `app-container.tsx`, `usage-info.tsx`, `result-list-info.tsx`, `src/tui/store/app.ts`, `events.ts`, `src/tui/contexts/result-list-context.tsx`, `src/utilities.ts`, `src/constants.ts`, `src/settings.ts`, `test/utilities.test.ts`.

**Also fix while here**: `src/tui/helpers/screen.ts` Windows clear-screen sequence is missing a backslash (`"u001b[H…"`).

**Done when**: unit tests for row formatter (widths, truncation, right-alignment, column dropping) and for cursor/jump logic; manual check at 60, 100 and 200 columns and at a short terminal.

**Done.** Notes from building it:
- Cells are Ink `<Box width>` + `truncate-end`, so Ink handles wide (CJK) characters; the only pure logic is `layoutColumns` / `scrollTopFor` in `src/tui/helpers/table.ts` (tested). Columns drop at roughly 64 / 51 / 43 columns wide.
- The number buffer has no timeout (vim-style): it clears on any non-digit key or `Esc`. A number before `j`/`k` moves that many rows.
- The Info view no longer shows the random internal `id`. Adapter `isHiddenField` / `formatField` were only used for that and are removed.
- The error screen uses keys (`r` retry, `q` quit). With that, `Option`/`OptionList`, both list-control hooks, `options.ts`, `constants.ts` (merged into `settings.ts`), the result-list context and the list-item model are gone.
- Fixed from real data: years like "2011 April 1" show as `2011`; titles had runs of spaces from the HTML (whitespace now collapsed in `clearText`); the search screen showed the minimum-length hint twice.
- Checked in a pseudo-terminal at 110×30 and 60×16.

### S5. User config file
- Location: `~/.config/lgd/config.json` on every platform (`os.homedir()` + `.config/lgd/config.json`; on Windows that is `%USERPROFILE%\.config\lgd\config.json`). No XDG or `%APPDATA%` lookup.
- Format: JSON with whole-line `//` comments allowed (loader strips them with `text.replace(/^\s*\/\/.*$/gm, "")` before `JSON.parse`; trailing and `/* */` comments unsupported).
- First run: if the file is missing, create it and its directory from the template below. If creation fails, continue with defaults and show a one-line warning. Never overwrite an existing file. No `--init-config` flag.
- Errors: unparseable file → all defaults + one warning. Bad value for one key → that key's default + warning. Unknown keys ignored.
- Module: new `src/user-config.ts` (separate from `store/config.ts`, which fetches the remote mirror list).

Template:
```jsonc
{
  // Where downloads are saved (default: current directory)
  // "downloadDir": "~/books",

  // Only show these filetypes (default: all)
  // "extensions": ["pdf", "epub"],

  // Results table columns, in order
  // "columns": ["index", "ext", "title", "authors", "year", "size"],

  // Preferred mirror, tried first. To find mirrors, see open-slum.org
  // "mirror": "https://libgen.li"
}
```

| Key | Type | Default | Notes |
|---|---|---|---|
| `downloadDir` | string | current directory | supports `~`; created if missing; relative paths resolve against cwd; used by TUI and CLI `-d`/`-b` |
| `extensions` | string[] | none (all) | case-insensitive, leading dot ignored |
| `columns` | string[] | `index, ext, title, authors, year, size` | also `language`, `pages`, `publisher`; unknown names ignored with a warning |
| `mirror` | string | none | treated as `libgen-plus` type; goes through the same reachability check; tried before the remote list; if the remote list can't be fetched but `mirror` is set, run with just that mirror |

- Precedence: CLI flags (`-e`, `-o <dir>`) and in-app `f` override the config. `-e all` or clearing the filter means "no filter" even if the config sets one. The app never writes the config after creating it.
- Later, if wanted: `languages`. Not planned: themes, key remapping, page size, size limits, filename templates.
- Files: `src/user-config.ts` (new), `src/tui/store/config.ts`, `src/api/data/download.ts`, `src/cli/index.ts`, `src/cli/operate.ts`, `test/user-config.test.ts` (new: parse, comments, defaults, precedence, invalid values).
- **Done.** Checked with a throwaway `HOME`: first run writes the template, custom `columns` and `downloadDir` (`~/books`, created on demand) take effect, an unknown column shows a warning. Config warnings go to the warning line (and stderr for `-u`). `-e` is parsed here but only filters from S6 on, so its help text lands there.
- Not covered by an automated test: the "remote mirror list unreachable, use `mirror` alone" path, because `attempt` retries the remote fetch 5 times with 2 s delays; it is a 5-line branch in `store/config.ts` `fetchConfig`.

### S6. Filetype filter + drop bad results
- **No server-side filter exists.** Tested against libgen.li: the search form has no extension field; `ext:pdf`, `extension:pdf`, `filetype:pdf` in the query return 0 results; extra URL parameters are ignored. Filtering is therefore client-side, on the parsed `extension`.
- **Sparse pages.** Real data: for "art of war", a 25-entry page had 6 pdf; a 100-entry page had 20 pdf, 59 cbr, 16 cbz, 5 epub. A filter can leave a 25-entry server page nearly empty.
- **Bad results** are always dropped, with no option: empty title, empty extension, or no mirror link.
- Inputs: `-e/--ext pdf,epub` flag, config `extensions`, `f` in the TUI. The filter lasts for the session and survives new searches; `f` re-filters cached raw pages instantly and is not saved.
- The cache stores raw parsed entries; the filter runs at read time.
- **Pagination with a filter (decided):**
  - Display pages stay 25 Results. While a filter is active, fetch from the mirror in chunks of 100 (`res=100`; the mirror accepts 25/50/100), accumulate matching Entries, and show 25 per page.
  - A page turn fetches another chunk when the buffer can't fill the page. Cap of 3 chunks per page turn, then show what's there.
  - "Next page exists" = buffer holds more matches, or the last chunk was full (100 raw entries).
  - With no filter: unchanged behaviour (25 per request).
- Header shows the active filter. If a page is still empty after the cap: "no matches; press `]` to keep looking".
- Files: `src/tui/store/events.ts`, `src/tui/store/cache.ts`, `src/api/adapters/libgen-plus-adapter.ts` (`getSearchURL` page size), `src/cli/*`, `test/filter.test.ts` (new), `test/search.integration.test.ts`.
- **Done.** One code path for both cases: `collectResults` walks mirror chunks (25 rows unfiltered, 100 filtered; measured 100 rows at ~7–10 s vs ~2.5–5 s for 25, so unfiltered stays at 25) and `showPage` slices out 25. This replaced the background next-page prefetch (`checkNextPage`, its `checking`/`error` states and the `r` key): the last page is known when the mirror returns a short chunk. The fetch cap applies per page turn; on a short page `]` looks further before moving on. `f` edits the filter in the footer; it is not saved.

### S7. Downloads panel
- Collapsed (default): one status line above the footer: `▸ Downloads: 1 active · 2 queued · 2 done · 0 failed`. Never auto-expands.
- `t` expands and focuses; `t`, `h` or `Esc` collapses and returns focus to the table. Expanded height is at most 6 rows (scrolls inside); the table shrinks accordingly.
- Panel keys: `j`/`k` move, `x` remove a queued item, `r` retry a failed item (re-queue), `c` clear finished.
- Not included: cancelling the active download (queue is sequential with no abort hook), pause, reorder.
- Row text: `⬇ 43%  <title>  1.1 / 2.1 MB`, `⧗ queued`, `✓ → <path>` (final name from S1), `✗ failed`.
- Generalises `download-indicator.tsx`.
- Files: `src/tui/components/download-indicator.tsx` (→ panel), `src/tui/store/download-queue.ts`, `src/tui/app.tsx`, `test/queue.integration.test.ts`.

### S8. Core logic review and refactor
Purpose: the code was written by someone else; check the core logic for bugs, waste and needless complexity. Runs last because S1–S7 rewrite the UI, store wiring and download path, so reviewing them earlier would be wasted. Behaviour-preserving except for bug fixes, each fix with a test.
- **Method:** review module by module using `/code-review` (correctness) and `/simplify` (reuse/efficiency), then a second ponytail pass (`/ponytail-audit`). One commit per module. Findings are recorded here or fixed in the same commit; nothing is fixed without a test or a stated reason.
- **Scope, in order:**
  1. `src/api/`: `data/document.ts`, `data/request.ts`, `data/download.ts`, `data/config.ts`, adapters.
  2. `src/utilities.ts`: `attempt` (retry/timeout/abort), `clearText`.
  3. `src/tui/store/`: `download-queue.ts`, `bulk-download-queue.ts`, `events.ts` (search/paging), `cache.ts`, `config.ts` (mirror switching), `app.ts`.
  4. `src/cli/`.
- **Seed list (unverified suspicions from reading, to confirm or discard):**
  - `getDocument` does not check `response.ok`, so an HTTP error page is parsed as if it were results; its `catch` discards the original error.
  - `downloadFile` swallows the underlying error message, and a failed or interrupted download may leave a partial file on disk.
  - `attempt`: `onFail` fires on the last attempt too; abort/timeout behaviour for streaming downloads is unclear (the timeout only covers fetching, verify).
  - Entry `id`s are random (`nanoid`) per parse, so any re-parse of the same page produces new ids and orphans progress state keyed by id.
  - `entryCacheMap` grows without bound and its key depends on the current mirror and query strings.
  - `setSearchValue` hardcodes `3` instead of `SEARCH_MIN_CHAR`.
  - `clearText` keeps only the first line and strips HTML tags from `textContent`, which is already plain text.
  - The store-slice `set` type is repeated in every slice file.
  - CLI `-b`/`-d`: the process exits before the final frame renders, so the screen ends on `DOWNLOADING 100%` / `COMPLETED (0)`.
  - Mirror failover/switching paths (`switchMirror`, `findMirror`) and `warningTimeout` in the store are worth a look for races.
- **Done when:** each scope item has a written verdict (fixed / no change / deferred with reason), tests cover each fix, and typecheck, lint, tests and build pass.

## 4. Decisions log
- App renamed `lgd`, version 1.0.0, original author credited (S0b). Config lives in `~/.config/lgd/`.
- Interactive bulk selection is removed; CLI `-b` and `-d` stay (ADR 0001).
- `q` is quit (guarded); `Ctrl-c` calls the same function.
- `Enter` and `d` download; `i`/`l`/`→` open Info.
- Page size fixed at 25; total result count not shown.
- With a filter active, fetch 100 entries per request behind the scenes and show 25 per page (S6).
- Config file is created on first run; first version has `downloadDir`, `extensions`, `columns`, `mirror`.
- Duplicate files get `(1)`, `(2)`, never overwritten.
- Ink/React stay; no framework swap.
- Header shows only mirror, query and page state; no version, no update check.
- `h` does nothing on the list; `Esc` and `/` restart the search.
- Bad results (empty title, empty extension, no mirror link) are dropped automatically.

## 5. Open questions
None. Decided: keep CLI `-b` and `-d` unchanged; no bulk in the interactive app; the app stops auto-writing the MD5 list file after a run (S2 checks whether `-d` also wrote it). See `docs/adr/0001-bulk-download-is-cli-only.md`.
