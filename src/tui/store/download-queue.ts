import { TCombinedStore } from "./index";
import { Entry } from "../../api/models/entry";
import { DownloadStatus } from "../../download-statuses";
import { attempt } from "../../utilities";
import { getDocument } from "../../api/data/document";
import { downloadFile } from "../../api/data/download";
import { fetchLibgen } from "../../api/data/request";

export interface IDownloadProgress {
  filename: string;
  total: number;
  progress: number | undefined;
  status: DownloadStatus;
}

export interface IDownloadQueueState {
  downloadQueue: Entry[];
  inDownloadQueueEntryIds: string[];
  downloadProgressMap: Record<string, IDownloadProgress>;
  // every Entry downloaded this session, in the order shown in the Downloads panel
  downloads: Entry[];
  isQueueActive: boolean;

  pushDownloadQueue: (entry: Entry) => void;
  consumeDownloadQueue: () => Entry | undefined;
  removeEntryIdFromDownloadQueue: (entryId: string) => void;
  iterateQueue: () => Promise<void>;
  updateCurrentDownloadProgress: (
    entryId: string,
    downloadProgress: Partial<IDownloadProgress>
  ) => void;
  removeQueuedDownload: (entryId: string) => void;
  clearFinishedDownloads: () => void;
}

export const initialDownloadQueueState = {
  downloadQueue: [],
  inDownloadQueueEntryIds: [],
  downloadProgressMap: {},
  downloads: [],
  isQueueActive: false,
};

export const createDownloadQueueStateSlice = (
  set: (
    partial: Partial<TCombinedStore> | ((state: TCombinedStore) => Partial<TCombinedStore>)
  ) => void,
  get: () => TCombinedStore
) => ({
  ...initialDownloadQueueState,

  pushDownloadQueue: (entry: Entry) => {
    const store = get();

    if (store.inDownloadQueueEntryIds.includes(entry.id)) {
      return;
    }

    set({
      downloadQueue: [...store.downloadQueue, entry],
      inDownloadQueueEntryIds: [...store.inDownloadQueueEntryIds, entry.id],
      downloads: [...store.downloads.filter((download) => download.id !== entry.id), entry],
    });

    store.updateCurrentDownloadProgress(entry.id, {
      filename: "",
      progress: 0,
      total: 0,
      status: DownloadStatus.IN_QUEUE,
    });

    if (store.isQueueActive) {
      return;
    }

    store.iterateQueue();
  },

  consumeDownloadQueue: () => {
    const store = get();

    if (store.downloadQueue.length === 0) {
      return;
    }

    const entry = store.downloadQueue[0];

    set({
      downloadQueue: store.downloadQueue.slice(1),
    });

    return entry;
  },

  removeEntryIdFromDownloadQueue: (entryId: string) => {
    const store = get();
    set({
      inDownloadQueueEntryIds: store.inDownloadQueueEntryIds.filter((id) => id !== entryId),
    });
  },

  iterateQueue: async () => {
    const store = get();

    set({ isQueueActive: true });

    for (;;) {
      const entry = store.consumeDownloadQueue();
      if (!entry) {
        break;
      }

      try {
        store.updateCurrentDownloadProgress(entry.id, {
          status: DownloadStatus.CONNECTING_TO_LIBGEN,
        });

        const detailPageUrl = store.mirrorAdapter?.getPageURL(entry.mirror);
        if (!detailPageUrl) {
          throw new Error(`Couldn't get the detail page URL for "${entry.title}"`);
        }

        const mirrorPageResult = await attempt((signal) => getDocument(detailPageUrl, signal));
        if (!mirrorPageResult) {
          throw new Error(`Couldn't fetch the mirror page for "${entry.title}"`);
        }

        const downloadUrl = store.mirrorAdapter?.getMainDownloadURLFromDocument(
          mirrorPageResult
        );
        if (!downloadUrl) {
          throw new Error(`Couldn't find the download url for "${entry.title}"`);
        }

        const downloadStream = await attempt((signal) => fetchLibgen(downloadUrl, signal));
        if (!downloadStream) {
          throw new Error(`Couldn't fetch the download stream for "${entry.title}"`);
        }

        store.updateCurrentDownloadProgress(entry.id, {
          status: DownloadStatus.DOWNLOADING,
        });

        await downloadFile({
          downloadStream,
          directory: store.userConfig.downloadDir,
          onStart: (filename, total) => {
            store.updateCurrentDownloadProgress(entry.id, {
              filename,
              progress: undefined,
              total,
            });
          },
          onData: (filename, chunk, total) => {
            store.updateCurrentDownloadProgress(entry.id, {
              filename,
              progress: chunk.length,
              total,
            });
          },
        });

        store.updateCurrentDownloadProgress(entry.id, {
          status: DownloadStatus.DOWNLOADED,
        });
      } catch (error) {
        store.setWarningMessage((error as Error).message);
        store.updateCurrentDownloadProgress(entry.id, {
          status: DownloadStatus.FAILED,
        });
      } finally {
        store.removeEntryIdFromDownloadQueue(entry.id);
      }
    }

    set({ isQueueActive: false });
  },

  updateCurrentDownloadProgress: (
    entryId: string,
    downloadProgress: Partial<IDownloadProgress>
  ) => {
    set((previous) => ({
      downloadProgressMap: {
        ...previous.downloadProgressMap,
        [entryId]: {
          ...previous.downloadProgressMap[entryId],
          ...downloadProgress,
          progress: (() => {
            if (!("progress" in downloadProgress)) {
              return previous.downloadProgressMap[entryId]?.progress;
            }
            if (downloadProgress.progress === undefined) {
              return 0;
            }
            return (
              (previous.downloadProgressMap[entryId]?.progress || 0) +
              (downloadProgress.progress || 0)
            );
          })(),
        },
      },
    }));
  },

  // Only waiting downloads can be removed; the active one has no abort hook.
  removeQueuedDownload: (entryId: string) => {
    const store = get();
    if (!store.downloadQueue.some((entry) => entry.id === entryId)) {
      return;
    }

    const downloadProgressMap = { ...store.downloadProgressMap };
    delete downloadProgressMap[entryId];
    set({
      downloadQueue: store.downloadQueue.filter((entry) => entry.id !== entryId),
      inDownloadQueueEntryIds: store.inDownloadQueueEntryIds.filter((id) => id !== entryId),
      downloads: store.downloads.filter((entry) => entry.id !== entryId),
      downloadProgressMap,
    });
  },

  // Drops finished and failed downloads from the panel; the results table keeps its ✓ / ✗.
  clearFinishedDownloads: () => {
    const store = get();
    set({
      downloads: store.downloads.filter((entry) => store.inDownloadQueueEntryIds.includes(entry.id)),
    });
  },
});
