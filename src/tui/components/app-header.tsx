import { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { fetchNewerVersion, version } from "../../update";
import { useBoundStore } from "../store";
import { LAYOUT_KEY } from "../layouts/keys";
import type { NextPageStatus } from "../store/app";

const PAGE_STATE: Record<NextPageStatus, string> = {
  idle: "",
  ready: " · n next",
  partial: " · n find more",
  unavailable: " · last page",
};

export function AppHeader() {
  const mirrorAdapter = useBoundStore((state) => state.mirrorAdapter);
  const activeLayout = useBoundStore((state) => state.activeLayout);
  const searchValue = useBoundStore((state) => state.searchValue);
  const currentPage = useBoundStore((state) => state.currentPage);
  const nextPageStatus = useBoundStore((state) => state.nextPageStatus);
  const filter = useBoundStore((state) => state.filter);

  const [newer, setNewer] = useState<string>();
  useEffect(() => {
    void fetchNewerVersion().then(setNewer);
  }, []);

  let mirror = "connecting…";
  if (mirrorAdapter) {
    mirror = new URL(mirrorAdapter.baseURL).host;
  }

  const showResults =
    activeLayout === LAYOUT_KEY.RESULT_LIST_LAYOUT || activeLayout === LAYOUT_KEY.DETAIL_LAYOUT;

  return (
    <Box flexDirection="column">
      <Text wrap="truncate-end">
        <Text bold color="cyan">
          libgen-dl v{version}
        </Text>
        {newer && <Text color="yellow"> (v{newer} available)</Text>}
        <Text color="gray"> · {mirror}</Text>
      </Text>
      <Text wrap="truncate-end">
        {showResults && (
          <Text>
            Results for <Text color="green">&quot;{searchValue}&quot;</Text> ...
            {filter.length > 0 && (
              <Text>
                <Text color="gray"> · </Text>
                <Text color="magenta">{filter.join(", ")} only</Text>
              </Text>
            )}
            <Text color="gray"> · </Text>page <Text color="yellow">{currentPage}</Text>
            <Text color="gray">{PAGE_STATE[nextPageStatus]}</Text>
          </Text>
        )}
        {!showResults && " "}
      </Text>
    </Box>
  );
}
