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

## Usage

```
lgd                         interactive mode
lgd -s "The Art of War"     start with a search
lgd -d <MD5>                download one file
lgd -b <MD5LIST.txt>        download every MD5 in a file (one per line)
lgd -u <MD5>                print the download URL
lgd -h                      help
```

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
