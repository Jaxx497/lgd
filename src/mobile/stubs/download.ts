// Mobile stand-in for api/data/download.ts (swapped in by scripts/build-web.ts).
import { Directory, Filesystem } from "@capacitor/filesystem";
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
  signal: AbortSignal;
}): Promise<void> {
  if (arguments_.signal.aborted) {
    throw new Error("Stopped");
  }
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

  // onStart resets the progress, so call it again whenever the size changes (a retry that can't
  // resume starts over), then report only what's new.
  let seen = 0;
  let size = 0;
  const listener = await Storage.addListener("downloadProgress", ({ bytes, total }) => {
    if (total > 0 && total !== size) {
      size = total;
      seen = 0;
      arguments_.onStart(filename, total);
    }
    arguments_.onProgress(bytes - seen);
    seen = bytes;
  });
  const stop = () => void Storage.stopDownload().catch(() => {});
  arguments_.signal.addEventListener("abort", stop);
  try {
    // the native side deletes its partial file on failure
    await Storage.download({
      url: arguments_.url,
      path: uri,
      label: filename,
      userAgent: LIBGEN_USER_AGENT,
    });
  } finally {
    arguments_.signal.removeEventListener("abort", stop);
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
