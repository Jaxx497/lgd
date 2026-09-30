import { useBoundStore } from "../../tui/store";
import Card from "./card";

// This session's downloads (running, queued, finished and failed), newest first.
export default function Downloads() {
  const downloads = useBoundStore((s) => s.downloads);
  const running = useBoundStore((s) => s.inDownloadQueueEntryIds.length);
  const clear = useBoundStore((s) => s.clearFinishedDownloads);

  if (downloads.length === 0) {
    return <div className="note">No downloads yet.</div>;
  }
  return (
    <>
      <div className="pager">
        <span>Downloads</span>
        {downloads.length > running && (
          <button className="ghost" onClick={clear}>
            Clear finished
          </button>
        )}
      </div>
      {/* reverse() on a copy: toReversed() is missing from older Android WebViews (e-ink devices) */}
      {/* eslint-disable-next-line unicorn/no-array-reverse */}
      {[...downloads].reverse().map((entry) => (
        <Card key={entry.id} entry={entry} />
      ))}
    </>
  );
}
