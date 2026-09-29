import { Box, Text } from "ink";

const KEYS: [string, string][] = [
  ["j k ↓ ↑", "move (a number first moves that many rows)"],
  ["g G", "first / last row"],
  ["ctrl-d ctrl-u", "half page down / up"],
  ["pgdn pgup", "page down / up"],
  ["<n> ⏎  or <n>G", "jump to row n"],
  ["⏎ d", "download"],
  ["i l →", "info"],
  ["] n  [ p", "next / previous page (] also looks further on a short page)"],
  ["f", "filter by filetype (pdf,epub; empty for all)"],
  ["t", "downloads panel (j/k, x remove queued, r retry failed, c clear)"],
  ["/ esc", "new search"],
  ["q ctrl-c", "quit"],
];

export function Help() {
  return (
    <Box flexDirection="column">
      {KEYS.map(([keys, action]) => (
        <Text key={keys} wrap="truncate-end">
          <Text color="yellow">{keys.padEnd(16)}</Text>
          {action}
        </Text>
      ))}
      <Text color="gray">press any key to close</Text>
    </Box>
  );
}
