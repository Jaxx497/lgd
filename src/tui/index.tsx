import { render } from "ink";

import { LAYOUT_KEY } from "./layouts/keys";
import App from "./app";
import { useBoundStore } from "./store";

interface renderTUIArguments {
  startInCLIMode: boolean;
  doNotFetchConfigInitially: boolean;
  initialLayout?: LAYOUT_KEY;
}

export default function renderTUI({
  startInCLIMode,
  doNotFetchConfigInitially,
  initialLayout,
}: renderTUIArguments) {
  if (startInCLIMode) {
    const store = useBoundStore.getState();
    store.setCLIMode(true);
  }

  const store = useBoundStore.getState();
  store.setActiveLayout(initialLayout || LAYOUT_KEY.SEARCH_LAYOUT);

  // Ctrl-c is handled by QuitGuard so it can ask before killing active downloads.
  // Incremental rendering rewrites only the lines that changed, which stops the flicker.
  const mount = (skipConfigFetch: boolean) =>
    render(<App doNotFetchConfigInitially={skipConfigFetch} />, {
      exitOnCtrlC: false,
      incrementalRendering: true,
    });
  let instance = mount(doNotFetchConfigInitially);

  // Terminals disagree on how to re-wrap and scroll an old frame, so a resize would leave debris.
  // Once resizing settles, wipe the screen and start Ink over (its own repaint skips an unchanged
  // frame, which would leave the wiped screen blank). State (results, mirror, downloads) lives in
  // the store, so nothing is refetched.
  if (!startInCLIMode) {
    let timer: NodeJS.Timeout | undefined;
    process.stdout.on("resize", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        instance.unmount();
        process.stdout.write("\u001B[2J\u001B[H");
        instance = mount(true);
      }, 80);
    });
  }
}
