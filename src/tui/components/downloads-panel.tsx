import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { useBoundStore } from "../store";
import { LAYOUT_KEY } from "../layouts/keys";
import { DownloadStatus } from "../../download-statuses";
import { getDownloadProgress, shortStatus } from "../helpers/progress";
import { scrollTopFor } from "../helpers/table";
import type { IDownloadProgress } from "../store/download-queue";

const PANEL_ROWS = 6;
const DETAIL_WIDTH = 30;
// Extra lines the expanded panel takes compared to the collapsed status line.
export const DOWNLOADS_PANEL_EXTRA_ROWS = PANEL_ROWS;

const detail = (download: IDownloadProgress | undefined): string => {
  switch (download?.status) {
    case DownloadStatus.DOWNLOADING: {
      const { downloadedSize, totalSize } = getDownloadProgress(
        download.progress || 0,
        download.total
      );
      return `${downloadedSize} / ${totalSize}`;
    }
    case DownloadStatus.IN_QUEUE: {
      return "queued";
    }
    case DownloadStatus.DOWNLOADED: {
      return `→ ${download.filename}`;
    }
    case DownloadStatus.FAILED: {
      return "failed";
    }
    default: {
      return "connecting";
    }
  }
};

// Collapsed: one status line. `t` (from the results or Info view) expands and focuses it.
export function DownloadsPanel() {
  const downloads = useBoundStore((state) => state.downloads);
  const downloadProgressMap = useBoundStore((state) => state.downloadProgressMap);
  const queuedCount = useBoundStore((state) => state.downloadQueue.length);
  const inProgressCount = useBoundStore((state) => state.inDownloadQueueEntryIds.length);
  const downloadDirectory = useBoundStore((state) => state.userConfig.downloadDir);
  const isOpen = useBoundStore((state) => state.downloadsPanelOpen);
  const setIsOpen = useBoundStore((state) => state.setDownloadsPanelOpen);
  const activeLayout = useBoundStore((state) => state.activeLayout);
  const isEditingFilter = useBoundStore((state) => state.isEditingFilter);
  const quitPromptVisible = useBoundStore((state) => state.quitPromptVisible);
  const pushDownloadQueue = useBoundStore((state) => state.pushDownloadQueue);
  const removeQueuedDownload = useBoundStore((state) => state.removeQueuedDownload);
  const clearFinishedDownloads = useBoundStore((state) => state.clearFinishedDownloads);

  const [cursor, setCursor] = useState(0);
  const [previousTop, setPreviousTop] = useState(0);
  const selected = Math.min(cursor, downloads.length - 1);
  const top = scrollTopFor(previousTop, selected, PANEL_ROWS, downloads.length);
  if (top !== previousTop) {
    setPreviousTop(top);
  }

  const canFocus =
    (activeLayout === LAYOUT_KEY.RESULT_LIST_LAYOUT || activeLayout === LAYOUT_KEY.DETAIL_LAYOUT) &&
    !isEditingFilter &&
    !quitPromptVisible;

  useInput(
    (input, key) => {
      if (!isOpen) {
        if (input === "t" && downloads.length > 0) {
          setIsOpen(true);
        }
        return;
      }

      const entry = downloads[selected];
      if (input === "t" || input === "h" || key.escape) {
        setIsOpen(false);
      } else if (input === "j" || key.downArrow) {
        setCursor(Math.min(selected + 1, downloads.length - 1));
      } else if (input === "k" || key.upArrow) {
        setCursor(Math.max(selected - 1, 0));
      } else if (input === "x" && entry) {
        removeQueuedDownload(entry.id);
      } else if (
        input === "r" &&
        entry &&
        downloadProgressMap[entry.id]?.status === DownloadStatus.FAILED
      ) {
        pushDownloadQueue(entry);
      } else if (input === "c") {
        clearFinishedDownloads();
      }
    },
    { isActive: canFocus }
  );

  if (downloads.length === 0) {
    return;
  }

  const statuses = downloads.map((entry) => downloadProgressMap[entry.id]?.status);
  const done = statuses.filter((status) => status === DownloadStatus.DOWNLOADED).length;
  const failed = statuses.filter((status) => status === DownloadStatus.FAILED).length;
  const summary = `Downloads: ${inProgressCount - queuedCount} active · ${queuedCount} queued · ${done} done · ${failed} failed`;

  if (!isOpen) {
    return (
      <Text color="gray" wrap="truncate-end">
        ▸ {summary} · t
      </Text>
    );
  }

  return (
    <Box flexDirection="column">
      <Text wrap="truncate-end">
        <Text color="cyanBright">▾ {summary}</Text>
        <Text color="gray">
          {" "}
          → {downloadDirectory} · j/k · x remove · r retry · c clear · t close
        </Text>
      </Text>
      {downloads.slice(top, top + PANEL_ROWS).map((entry, index) => {
        const download = downloadProgressMap[entry.id];
        const isSelected = top + index === selected;
        let pointer = "  ";
        if (isSelected) {
          pointer = "▸ ";
        }
        return (
          <Box key={entry.id}>
            <Box width={2 + 6} flexShrink={0}>
              <Text color="cyanBright">{pointer}</Text>
              <Text color="yellow">{shortStatus(download)}</Text>
            </Box>
            <Box flexGrow={1}>
              <Text wrap="truncate-end" bold={isSelected}>
                {entry.title}
              </Text>
            </Box>
            <Box marginLeft={2} width={DETAIL_WIDTH} flexShrink={0}>
              <Text color="gray" wrap="truncate-end">
                {detail(download)}
              </Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
