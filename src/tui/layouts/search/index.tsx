import type { FC } from "react";
import { Box } from "ink";

import SearchInput from "./search-input/search-input";
import { useBoundStore } from "../../store";
import { LoadingSpinner } from "../../components/loading-spinner";
import { KeyHints } from "../../components/key-hints";
import { SEARCH_HINTS } from "../hints";

const Search: FC = () => {
  const isLoading = useBoundStore((state) => state.isLoading);
  const loaderMessage = useBoundStore((state) => state.loaderMessage);

  if (isLoading) {
    return <LoadingSpinner message={loaderMessage} />;
  }

  return (
    <Box flexDirection="column">
      <SearchInput />
      <KeyHints hints={SEARCH_HINTS} />
    </Box>
  );
};

export default Search;
