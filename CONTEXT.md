# lgd

A personal terminal app for searching a Library Genesis mirror and downloading books from it.

## Language

**Entry**:
One book record returned by a mirror search (title, authors, publisher, year, language, size, extension, mirror link).
_Avoid_: Result (for a single record), listing, item, book

**Results**:
The Entries currently shown to the user for a search, after the filter is applied.
_Avoid_: Listings, hits

**Mirror**:
A Libgen website the app searches and downloads from.
_Avoid_: Server, site, host

**Filter**:
The set of filetypes the user wants to see. Entries with other extensions are hidden.
_Avoid_: Search filter, extension whitelist

**Download**:
Fetching one Entry's file to disk. Started with `d` or `Enter` on an Entry.
_Avoid_: Fetch, grab

**Download queue**:
The ordered set of Downloads waiting for or running in the interactive app; one runs at a time.
_Avoid_: Bulk queue, job list

**Downloads panel**:
The collapsible area that shows the Download queue's active, queued, finished and failed Downloads.
_Avoid_: Download box, download list

**Bulk download**:
The command-line mode (`-b`) that downloads every MD5 in a text file. Not available interactively.
_Avoid_: Bulk queue (that interactive feature is removed)

**Info**:
The full detail view of one Entry, opened with `i`.
_Avoid_: Details page, detail layout
