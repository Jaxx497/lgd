import { useState, type FC } from "react";
import { Box, Text, useInput } from "ink";
import ContentContainer from "../../components/content-container";
import { KeyHints } from "../../components/key-hints";
import { useBoundStore } from "../../store";
import { useStdoutDimensions } from "../../hooks/use-stdout-dimensions";
import { DEFAULT_COLUMNS, layoutColumns, scrollTopFor } from "../../helpers/table";
import { LAYOUT_KEY } from "../keys";
import { ResultListLoadingSkeleton } from "./result-list-loading-skeleton";
import { ResultRow } from "./result-row";
import { Help } from "./help";

// Lines outside the table: header, table border (2), key hints, and up to 3 status lines
// (downloads, warning, quit prompt), plus one spare so Ink never fills the whole screen.
const RESERVED_ROWS = 8;
// App margin (2) + table border (2) + table padding (2) + row pointer (2).
const RESERVED_COLUMNS = 8;

const HINTS = "j/k move · <n>⏎ jump · ⏎/d download · i info · ]/[ page · / search · ? help · q quit";

const ResultList: FC = () => {
  const entries = useBoundStore((state) => state.entries);
  const cursor = useBoundStore((state) => state.cursor);
  const setCursor = useBoundStore((state) => state.setCursor);
  const isLoading = useBoundStore((state) => state.isLoading);
  const quitPromptVisible = useBoundStore((state) => state.quitPromptVisible);
  const currentPage = useBoundStore((state) => state.currentPage);
  const nextPageStatus = useBoundStore((state) => state.nextPageStatus);
  const searchValue = useBoundStore((state) => state.searchValue);
  const pushDownloadQueue = useBoundStore((state) => state.pushDownloadQueue);
  const nextPage = useBoundStore((state) => state.nextPage);
  const previousPage = useBoundStore((state) => state.prevPage);
  const checkNextPage = useBoundStore((state) => state.checkNextPage);
  const backToSearch = useBoundStore((state) => state.backToSearch);
  const setDetailedEntry = useBoundStore((state) => state.setDetailedEntry);
  const setActiveLayout = useBoundStore((state) => state.setActiveLayout);

  const [columns, rows] = useStdoutDimensions();
  const [count, setCount] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [previousTop, setPreviousTop] = useState(0);

  const height = Math.max(3, rows - RESERVED_ROWS);
  // Scroll only as far as needed to keep the cursor visible (state from the previous render).
  const top = scrollTopFor(previousTop, cursor, height, entries.length);
  if (top !== previousTop) {
    setPreviousTop(top);
  }

  useInput(
    (input, key) => {
      if (showHelp) {
        setShowHelp(false);
        return;
      }

      if (/^\d$/.test(input)) {
        setCount(count + input);
        return;
      }

      const last = entries.length - 1;
      const repeat = Number(count) || 1;
      const moveTo = (index: number) => setCursor(Math.max(0, Math.min(last, index)));
      const entry = entries[cursor];
      setCount("");

      if (key.escape && count) {
        return;
      }
      if (key.return && count) {
        moveTo(Number(count) - 1);
        return;
      }
      if (input === "G") {
        let target = last;
        if (count) {
          target = Number(count) - 1;
        }
        moveTo(target);
        return;
      }
      if (input === "j" || key.downArrow) {
        moveTo(cursor + repeat);
      } else if (input === "k" || key.upArrow) {
        moveTo(cursor - repeat);
      } else if (input === "g") {
        moveTo(0);
      } else if (key.ctrl && input === "d") {
        moveTo(cursor + Math.floor(height / 2));
      } else if (key.ctrl && input === "u") {
        moveTo(cursor - Math.floor(height / 2));
      } else if (key.pageDown) {
        moveTo(cursor + height);
      } else if (key.pageUp) {
        moveTo(cursor - height);
      } else if ((input === "d" || key.return) && entry) {
        pushDownloadQueue(entry);
      } else if ((input === "i" || input === "l" || key.rightArrow) && entry) {
        setDetailedEntry(entry);
        setActiveLayout(LAYOUT_KEY.DETAIL_LAYOUT);
      } else if ((input === "]" || input === "n") && nextPageStatus === "ready") {
        nextPage();
      } else if ((input === "[" || input === "p") && currentPage > 1) {
        previousPage();
      } else if (input === "r" && nextPageStatus === "error") {
        checkNextPage(searchValue, currentPage + 1);
      } else if (input === "/" || key.escape) {
        backToSearch();
      } else if (input === "?") {
        setShowHelp(true);
      }
    },
    { isActive: !isLoading && !quitPromptVisible }
  );

  if (isLoading) {
    return <ResultListLoadingSkeleton height={height} />;
  }

  const layout = layoutColumns(
    DEFAULT_COLUMNS,
    columns - RESERVED_COLUMNS,
    String(entries.length).length
  );

  return (
    <Box flexDirection="column">
      <ContentContainer>
        {showHelp && <Help />}
        {!showHelp && entries.length === 0 && <Text color="gray">No results.</Text>}
        {!showHelp &&
          entries
            .slice(top, top + height)
            .map((entry, index) => (
              <ResultRow
                key={entry.id}
                entry={entry}
                rowNumber={top + index + 1}
                isActive={top + index === cursor}
                layout={layout}
              />
            ))}
      </ContentContainer>
      <Text wrap="truncate-end">
        {count && <Text color="yellow">:{count} </Text>}
        <KeyHints hints={HINTS} />
      </Text>
    </Box>
  );
};

export default ResultList;
