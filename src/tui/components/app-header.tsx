import { Text } from "ink";
import { useBoundStore } from "../store";
import { LAYOUT_KEY } from "../layouts/keys";
import type { NextPageStatus } from "../store/app";

const PAGE_STATE: Record<NextPageStatus, string> = {
  idle: "",
  ready: " · next ▸",
  partial: " · ] find more",
  unavailable: " · last page",
};

export function AppHeader() {
  const mirrorAdapter = useBoundStore((state) => state.mirrorAdapter);
  const activeLayout = useBoundStore((state) => state.activeLayout);
  const searchValue = useBoundStore((state) => state.searchValue);
  const currentPage = useBoundStore((state) => state.currentPage);
  const nextPageStatus = useBoundStore((state) => state.nextPageStatus);
  const filter = useBoundStore((state) => state.filter);

  let mirror = "connecting…";
  if (mirrorAdapter) {
    mirror = new URL(mirrorAdapter.baseURL).host;
  }

  const showResults =
    activeLayout === LAYOUT_KEY.RESULT_LIST_LAYOUT || activeLayout === LAYOUT_KEY.DETAIL_LAYOUT;

  return (
    <Text wrap="truncate-end">
      <Text color="gray">{mirror}</Text>
      {showResults && (
        <Text>
          <Text color="gray"> · </Text>Results for{" "}
          <Text color="green">&quot;{searchValue}&quot;</Text>
          <Text color="gray"> · </Text>page <Text color="yellow">{currentPage}</Text>
          <Text color="gray">{PAGE_STATE[nextPageStatus]}</Text>
          {filter.length > 0 && <Text color="magenta"> · {filter.join(",")}</Text>}
        </Text>
      )}
    </Text>
  );
}
