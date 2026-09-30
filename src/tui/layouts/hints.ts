// [key, label] pairs; KeyHints colors the key. Only the primary key is shown for each action;
// the full list is on the `?` help screen.
export type Hint = [key: string, label: string];

export const RESULT_LIST_HINTS: Hint[] = [
  ["↑↓", "move"],
  ["⏎", "download"],
  ["i", "details"],
  ["n/p", "page"],
  ["f", "filter"],
  ["t", "downloads"],
  ["/", "search"],
  ["?", "help"],
  ["q", "quit"],
];
export const DETAIL_HINTS: Hint[] = [
  ["⏎", "download"],
  ["←", "back"],
  ["t", "downloads"],
  ["q", "quit"],
];
export const SEARCH_HINTS: Hint[] = [
  ["⏎", "search"],
  ["ctrl-c", "quit"],
];
export const PANEL_HINTS: Hint[] = [
  ["↑↓", "move"],
  ["x", "stop"],
  ["r", "retry"],
  ["c", "clear"],
  ["t", "close"],
];
