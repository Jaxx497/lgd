# lgd

`lgd` is a terminal app for searching and downloading books from **LibGen** mirrors.

It is a personal fork of [libgen-downloader](https://github.com/obsfx/libgen-downloader) by Ömercan Balandı, licensed under the WTFPL (see `LICENSE`). The original's history is kept at the bottom of this file.

The list of mirrors is still fetched from the original project's [configuration](https://github.com/obsfx/libgen-downloader/blob/configuration/config.v3.json) branch. To find mirrors yourself, see https://open-slum.org/.

## Build

Requires [Bun](https://bun.sh).

```
bun install
bun run compile:linux-x64   # or compile:macos-arm64, compile:windows-x64, ...
```

The binary is written to `standalone-executables/lgd-<os>-<arch>`.

## Android

A small Capacitor app shares the search and download logic with the TUI (`src/mobile/`).
The **Android APK** workflow builds a debug APK on GitHub; run it from the Actions tab and
download `lgd-debug-apk`. Locally, `bun run web` bundles the UI into `www/`.

Downloads land in the app cache and open the Android share sheet via **Save**, since Android
blocks direct writes to Downloads.

## Usage

```
lgd                           interactive mode
lgd -s "The Art of War"       start with a search
lgd -s "art of war" -e epub   only show epub results ("-e all" for every type)
lgd -d <MD5> -o ~/books       download one file into ~/books
lgd -b <MD5LIST.txt>          download every MD5 in a file (one per line)
lgd -u <MD5>                  print the download URL
lgd -h                        help
```

`-b` and `-d` exit with code 1 if any download failed.

### Keys (results list)

| Key | Action |
|---|---|
| `j` `k` / `↓` `↑` | move (a number first moves that many rows) |
| `g` `G` | first / last row |
| `Ctrl-d` `Ctrl-u`, `PgDn` `PgUp` | half page / page |
| `<n>` then `Enter` (or `<n>G`) | jump to row n |
| `Enter` / `d` | download |
| `i` / `l` / `→` | info (`h` / `←` / `Esc` back) |
| `]` `[` (or `n` `p`) | next / previous page (on a short filtered page `]` looks further) |
| `f` | filter by filetype (`pdf,epub`; empty for all) |
| `t` | downloads panel (`x` remove queued, `r` retry failed, `c` clear finished) |
| `/` / `Esc` | new search (previous query pre-filled) |
| `?` | help |
| `q` / `Ctrl-c` | quit (asks first while downloads are running) |

Existing files are never overwritten: a second copy is saved as `name(1).ext`.

### Config

`~/.config/lgd/config.json` is created on first run with every option commented out. Lines starting with `//` are comments.

```jsonc
{
  // default: current directory
  "downloadDir": "~/books",
  // default: all filetypes
  "extensions": ["pdf", "epub"],
  // also available: language, pages, publisher
  "columns": ["index", "ext", "title", "authors", "year", "size"],
  // tried first; see open-slum.org for mirrors
  "mirror": "https://libgen.li"
}
```

Command-line flags override the file.

## History (original libgen-downloader)

v3.0.0

- Added new `libgen+` mirrors as primary source. App is now usable as long as the `libgen+` mirrors are available.
- Dropped `search by` filtering options to make it compatible with the new `libgen+` mirrors.
- Dropped `alternative downloads` feature to make it compatible with the new `libgen+` mirrors.

---

v2.0.0

- Added alternative downloads.
- Added new download progress indicators.
- Added a cache mechanism to quickly retrieve previously searched results..
- Added new CLI parameter `-s, --search` to search queries directly in the command line.
- Added new shortcut keys to simplify usage:
	- `[J]` and `[K]` to move up and down for vimmers.
	- `[TAB]` to add an entry to the bulk download queue.
	- `[D]` to download an entry directly.
- Dropped result filtering. Instead added `Search by` filtering options to filter in columns like the original libgen search functionality.

---

v1.3.7

- Changed cli module and usage.
- Refactored downloading processes.
- README simplified.

---

v1.3

- Whole app was rewritten using `React`, `Ink` and `Zustand`.
- Added result filtering.
- Now you do not have to wait while downloading files using the `direct download` option.
- New version notifier.
- Due to the https://gen.lib.rus.ec is banned in my country, now libgen-downloader fetches the latest configuration file from the [configuration](https://github.com/obsfx/libgen-downloader/tree/configuration) branch and finds an available mirror dynamically.

---

v1.2

- Direct download option added as a cli functionality.

---

v1.1

- New and mostly resizeable UI.

---

v1.0

- Addded bulk downloading
- Improved error handling.
- When a connection error occurs, `libgen-downloader` does not shut down instantly. It tries 5 times to do same request with 3 seconds of delay.
- New customized UI module.
