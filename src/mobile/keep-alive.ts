import { useBoundStore } from "../tui/store";
import { Storage } from "./storage";

// While the queue runs, a foreground service keeps the app alive (Android kills a backgrounded
// app's downloads otherwise). The native download fills in its notification's progress.
export function keepAliveWhileDownloading() {
  let running = false;

  useBoundStore.subscribe((s) => {
    if (s.isQueueActive === running) {
      return;
    }
    running = s.isQueueActive;
    if (running) {
      void Storage.startKeepAlive({ text: "Starting download", percent: -1 }).catch(() => {});
      return;
    }
    void Storage.stopKeepAlive().catch(() => {});
  });
}
