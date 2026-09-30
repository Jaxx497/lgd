import { Box, Text } from "ink";

const KEYS: [string, string][] = [
  ["↑ ↓  or  j k", "move (type a number first to move that many rows)"],
  ["g  G", "first / last row"],
  ["<row> ⏎", "jump to a row: type its number, then press enter"],
  ["ctrl-d  ctrl-u", "half page down / up"],
  ["pgdn  pgup", "page down / up"],
  ["⏎  or  d", "download"],
  ["i  or  →", "details"],
  ["n  p", "next / previous page (n also looks further on a short page)"],
  ["f", "filter by filetype (pdf,epub; empty for all)"],
  ["t", "downloads panel"],
  ["/  or  esc", "new search"],
  ["q  or  ctrl-c", "quit"],
];

export function Help() {
  return (
    <Box flexDirection="column">
      {KEYS.map(([keys, action]) => (
        <Text key={keys} wrap="truncate-end">
          <Text color="cyanBright">{keys.padEnd(16)}</Text>
          {action}
        </Text>
      ))}
      <Text color="gray">press any key to close</Text>
    </Box>
  );
}
