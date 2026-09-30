import { Directory, Filesystem } from "@capacitor/filesystem";
import { FileOpener } from "@capacitor-community/file-opener";
import { Share } from "@capacitor/share";
import type { Entry } from "../../api/models/entry";
import { DownloadStatus } from "../../download-status";
import { getDownloadProgress } from "../../tui/helpers/progress";
import { useBoundStore } from "../../tui/store";

const MIME: Record<string, string> = {
  epub: "application/epub+zip",
  pdf: "application/pdf",
  mobi: "application/x-mobipocket-ebook",
  djvu: "image/vnd.djvu",
};

// The file lives in the app cache, which no file browser can reach, so open it in a reader app
// (chooser); with no reader installed, fall back to the share sheet.
const open = async (filename: string, extension: string) => {
  const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
  try {
    await FileOpener.open({
      filePath: uri,
      contentType: MIME[extension.toLowerCase()] ?? "application/octet-stream",
      openWithDefault: false,
    });
  } catch {
    await Share.share({ files: [uri], dialogTitle: filename });
  }
};

export default function Card({ entry }: { entry: Entry }) {
  const download = useBoundStore((s) => s.downloadProgressMap[entry.id]);
  const push = useBoundStore((s) => s.pushDownloadQueue);
  const status = download?.status;
  const { progressPercentage, downloadedSize, totalSize } = getDownloadProgress(
    download?.progress ?? 0,
    download?.total ?? 0
  );

  let action = <button onClick={() => push(entry)}>Download</button>;
  let label = "";
  let tone = "";
  switch (status) {
    case undefined:
    case DownloadStatus.IDLE: {
      break;
    }
    case DownloadStatus.DOWNLOADED: {
      action = <button onClick={() => open(download.filename, entry.extension)}>Open</button>;
      label = "Downloaded";
      tone = " ok";
      break;
    }
    case DownloadStatus.FAILED: {
      action = <button onClick={() => push(entry)}>Retry</button>;
      label = "Failed";
      tone = " bad";
      break;
    }
    case DownloadStatus.IN_QUEUE: {
      action = <button disabled>Queued</button>;
      break;
    }
    default: {
      action = <button disabled>…</button>;
      label = "Connecting…";
      if (download.total) {
        label = `${downloadedSize} / ${totalSize}`;
      } else if (download.progress) {
        label = downloadedSize;
      }
    }
  }

  return (
    <div className="card">
      <div className="title">{entry.title}</div>
      {entry.authors && <div className="authors">{entry.authors}</div>}
      <div className="meta">
        <span className="ext">{entry.extension}</span>
        {[entry.size, entry.year, entry.language].filter(Boolean).map((part) => (
          <span key={part}>{part}</span>
        ))}
      </div>
      {status === DownloadStatus.DOWNLOADING && (
        <div className="bar">
          <i style={{ width: `${progressPercentage}%` }} />
        </div>
      )}
      <div className="row">
        <span className={`status${tone}`}>{label}</span>
        {action}
      </div>
    </div>
  );
}
