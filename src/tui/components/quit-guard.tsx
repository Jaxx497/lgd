import { Text, useInput } from "ink";
import { useBoundStore } from "../store";
import { LAYOUT_KEY } from "../layouts/keys";

// Global quit keys: `q` and Ctrl-c both call requestQuit(). Also renders the confirm line.
export function QuitGuard() {
  const CLIMode = useBoundStore((state) => state.CLIMode);
  const activeLayout = useBoundStore((state) => state.activeLayout);
  const quitPromptVisible = useBoundStore((state) => state.quitPromptVisible);
  const setQuitPromptVisible = useBoundStore((state) => state.setQuitPromptVisible);
  const requestQuit = useBoundStore((state) => state.requestQuit);
  const handleExit = useBoundStore((state) => state.handleExit);
  const inDownloadQueueEntryIds = useBoundStore((state) => state.inDownloadQueueEntryIds);
  const queuedCount = useBoundStore((state) => state.downloadQueue.length);

  // `q` must stay typeable in text inputs
  const textInputFocused = activeLayout === LAYOUT_KEY.SEARCH_LAYOUT;

  useInput((input, key) => {
    const isCtrlC = key.ctrl && input === "c";

    // CLI -b / -d: keep the old behaviour, Ctrl-c quits immediately
    if (CLIMode) {
      if (isCtrlC) {
        handleExit();
      }
      return;
    }

    if (quitPromptVisible) {
      if (isCtrlC || input === "y" || input === "q") {
        handleExit();
        return;
      }
      setQuitPromptVisible(false);
      return;
    }

    if (isCtrlC || (input === "q" && !textInputFocused)) {
      requestQuit();
    }
  });

  if (!quitPromptVisible) {
    return;
  }

  const activeCount = inDownloadQueueEntryIds.length - queuedCount;
  return (
    <Text color="yellow">
      ⚠ {activeCount} downloading, {queuedCount} queued. Quit anyway? [y/N]
    </Text>
  );
}
