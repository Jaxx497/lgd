# Bulk download is command-line only

The interactive bulk queue (Tab to mark Entries, then "Start Bulk Download") is removed; `d` on a single Entry replaces it. The `-b <MD5LIST.txt>` and `-d <MD5>` commands stay, because they cost almost nothing (they share one code path) and cover the occasional "download several things at once" case. The app no longer writes an MD5 list file after a run, since nothing interactive produces lists any more.
