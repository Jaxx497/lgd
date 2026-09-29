import meow from "meow";

export const cli = meow(
  `
	Usage
	  $ lgd <input>

	Options
    -s, --search <query>      search for a book
    -b, --bulk <MD5LIST.txt>  start the app in bulk downloading mode
    -u, --url <MD5>           get the download URL
    -d, --download <MD5>      download the file
    -h, --help                display help

	Examples
    $ lgd    (start the app in interactive mode without flags)
    $ lgd -s "The Art of War"
    $ lgd -b ./MD5_LIST_1695686580524.txt
    $ lgd -u 1234567890abcdef1234567890abcdef
    $ lgd -d 1234567890abcdef1234567890abcdef
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
      help: {
        type: "boolean",
        shortFlag: "h",
      },
    },
  }
);
