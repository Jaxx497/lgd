import type { GetState, SetState } from "./index";
import { Entry } from "../../api/models/entry";
import { DownloadStatus } from "../../download-status";
import { attempt } from "../../utilities";
import { getDocument } from "../../api/data/document";
import { saveFromUrl } from "../../api/data/download";

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
  addDownloadProgress: (entryId: string, bytes: number) => void;
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

export const createDownloadQueueStateSlice = (set: SetState, get: GetState) => ({
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

        // read the adapter per download: the mirror may have been switched meanwhile
        const detailPageUrl = get().mirrorAdapter?.getPageURL(entry.mirror);
        if (!detailPageUrl) {
          throw new Error(`Couldn't get the detail page URL for "${entry.title}"`);
        }

        const mirrorPageResult = await attempt((signal) => getDocument(detailPageUrl, signal));
        if (!mirrorPageResult) {
          throw new Error(`Couldn't fetch the mirror page for "${entry.title}"`);
        }

        const downloadUrl = get().mirrorAdapter?.getMainDownloadURLFromDocument(mirrorPageResult);
        if (!downloadUrl) {
          throw new Error(`Couldn't find the download url for "${entry.title}"`);
        }

        store.updateCurrentDownloadProgress(entry.id, {
          status: DownloadStatus.DOWNLOADING,
        });

        await saveFromUrl({
          url: downloadUrl,
          directory: get().userConfig.downloadDir,
          filename: `${entry.title}.${entry.extension}`,
          onStart: (filename, total) => {
            store.updateCurrentDownloadProgress(entry.id, { filename, progress: 0, total });
          },
          onProgress: (bytes) => store.addDownloadProgress(entry.id, bytes),
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
        [entryId]: { ...previous.downloadProgressMap[entryId], ...downloadProgress },
      },
    }));
  },

  addDownloadProgress: (entryId: string, bytes: number) => {
    set((previous) => {
      const current = previous.downloadProgressMap[entryId];
      return {
        downloadProgressMap: {
          ...previous.downloadProgressMap,
          [entryId]: { ...current, progress: (current?.progress || 0) + bytes },
        },
      };
    });
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
      downloads: store.downloads.filter((entry) =>
        store.inDownloadQueueEntryIds.includes(entry.id)
      ),
    });
  },
});
