import { Box, Text, useInput } from "ink";
import { useBoundStore } from "../store";
import { SEARCH_MIN_CHAR } from "../../settings";
import type { Hint } from "../layouts/hints";
import { KeyHints } from "./key-hints";

export function ErrorMessage() {
  const errorMessage = useBoundStore((state) => state.errorMessage);
  const setErrorMessage = useBoundStore((state) => state.setErrorMessage);
  const handleSearchSubmit = useBoundStore((state) => state.handleSearchSubmit);
  const searchValue = useBoundStore((state) => state.searchValue);

  const canRetry = searchValue.length >= SEARCH_MIN_CHAR;

  useInput((input) => {
    if (input === "r" && canRetry) {
      setErrorMessage(undefined);
      handleSearchSubmit();
    }
  });

  let hints: Hint[] = [["q", "quit"]];
  if (canRetry) {
    hints = [
      ["r", "retry"],
      ["q", "quit"],
    ];
  }

  return (
    <Box flexDirection="column">
      <Text>
        Something went wrong: <Text color="red">{errorMessage}</Text>
      </Text>
      <KeyHints hints={hints} />
    </Box>
  );
}
