import meow from "meow";

export const cli = meow(
  `
  Usage
    $ libgen-dl [options]

  Options
    -s, --search <query>      start with a search
    -d, --download <MD5>      download one file
    -b, --bulk <MD5LIST.txt>  download every MD5 in a file (one per line)
    -u, --url <MD5>           print the download URL
    -e, --ext <pdf,epub>      only show these filetypes ("all" for every type)
    -l, --language <name>     list books in this language first (e.g. English)
    -o, --output <dir>        download directory (overrides the config file)
    -h, --help                display help

  Config file: ~/.config/libgen-dl/config.json (created on first run)

  Examples
    $ libgen-dl
    $ libgen-dl -s "The Art of War" -e epub
    $ libgen-dl -d 1234567890abcdef1234567890abcdef -o ~/books
    $ libgen-dl -b ./md5-list.txt
`,
  {
    importMeta: import.meta,
    flags: {
      search: {
        type: "string",
        shortFlag: "s",
      },
      bulk: {
        type: "string",
        shortFlag: "b",
      },
      url: {
        type: "string",
        shortFlag: "u",
      },
      download: {
        type: "string",
        shortFlag: "d",
      },
      ext: {
        type: "string",
        shortFlag: "e",
      },
      language: {
        type: "string",
        shortFlag: "l",
      },
      output: {
        type: "string",
        shortFlag: "o",
      },
      help: {
        type: "boolean",
        shortFlag: "h",
      },
    },
  }
);
