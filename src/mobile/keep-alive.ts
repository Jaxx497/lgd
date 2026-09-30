import { DownloadStatus } from "../download-status";
import { useBoundStore } from "../tui/store";
import { Storage } from "./storage";

// While the queue runs, a foreground service keeps the app alive and its notification shows the
// active download's progress. Android kills a backgrounded app's transfers otherwise.
export function keepAliveWhileDownloading() {
  let running = false;
  let shown = "";

  useBoundStore.subscribe((s) => {
    if (!s.isQueueActive) {
      if (running) {
        running = false;
        shown = "";
        void Storage.stopKeepAlive().catch(() => {});
      }
      return;
    }

    const active = s.downloads.find((entry) =>
      [DownloadStatus.CONNECTING_TO_LIBGEN, DownloadStatus.DOWNLOADING].includes(
        s.downloadProgressMap[entry.id]?.status
      )
    );
    const progress = active && s.downloadProgressMap[active.id];
    let percent = -1;
    if (progress?.total) {
      percent = Math.floor(((progress.progress ?? 0) / progress.total) * 100);
    }
    let text = active?.title ?? "Starting";
    if (s.downloadQueue.length > 0) {
      text += ` (+${s.downloadQueue.length} waiting)`;
    }

    if (`${text}|${percent}` === shown) {
      return;
    }
    shown = `${text}|${percent}`;

    const update = running;
    running = true;
    if (update) {
      void Storage.updateKeepAlive({ text, percent }).catch(() => {});
      return;
    }
    void Storage.startKeepAlive({ text, percent }).catch(() => {});
  });
}
