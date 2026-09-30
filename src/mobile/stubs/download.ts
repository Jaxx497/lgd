// Mobile stand-in for api/data/download.ts (swapped in by scripts/build-web.ts).
import { Directory, Filesystem } from "@capacitor/filesystem";
import { FileTransfer } from "@capacitor/file-transfer";
import { LIBGEN_USER_AGENT } from "../../settings";
import { getFolder, mimeFor, Storage } from "../storage";

export const removePartialDownloads = () => {};

export const downloadFile = (): never => {
  throw new Error("Bulk download is CLI only");
};

const exists = (path: string) =>
  Filesystem.stat({ path, directory: Directory.Cache }).then(
    () => true,
    () => false
  );

// Where each finished download ended up (a content:// URI), for the Open button.
export const savedUris = new Map<string, string>();

// ponytail: the file is named after the Entry (the mirror's content-disposition needs a request
// the native downloader doesn't expose). It downloads into the app cache, then the Storage plugin
// copies it to Downloads or the folder chosen in settings.
export async function saveFromUrl(arguments_: {
  url: string;
  filename: string;
  onStart: (filename: string, total: number) => void;
  onProgress: (bytes: number) => void;
}): Promise<void> {
  const clean = arguments_.filename.replaceAll(/[\\/:*?"<>|\s]+/g, " ").trim();
  const dot = clean.lastIndexOf(".");
  const stem = clean.slice(0, Math.min(dot, 100));
  const extension = clean.slice(dot);
  let filename = stem + extension;
  for (let index = 1; await exists(filename); index++) {
    filename = `${stem}(${index})${extension}`;
  }

  arguments_.onStart(filename, 0);
  const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });

  // One event stream per download (the queue runs one at a time). onStart resets the progress, so
  // call it once when the size is known, then report only what's new.
  let seen = 0;
  let sized = false;
  const listener = await FileTransfer.addListener("progress", (status) => {
    if (!sized && status.lengthComputable) {
      sized = true;
      arguments_.onStart(filename, status.contentLength);
    }
    arguments_.onProgress(status.bytes - seen);
    seen = status.bytes;
  });
  try {
    await FileTransfer.downloadFile({
      url: arguments_.url,
      path: uri,
      progress: true,
      headers: { "User-Agent": LIBGEN_USER_AGENT },
    });
  } catch (error) {
    await Filesystem.deleteFile({ path: filename, directory: Directory.Cache }).catch(() => {});
    throw error;
  } finally {
    await listener.remove();
  }

  try {
    const published = await Storage.publish({
      path: uri,
      name: filename,
      mime: mimeFor(filename),
      tree: getFolder()?.uri,
    });
    savedUris.set(filename, published.uri);
  } catch (error) {
    await Filesystem.deleteFile({ path: filename, directory: Directory.Cache }).catch(() => {});
    throw error;
  }
}
