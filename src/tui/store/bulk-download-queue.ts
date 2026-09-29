import { TCombinedStore } from "./index";
import { DownloadStatus } from "../../download-statuses";
import { attempt } from "../../utilities";
import { IDownloadProgress } from "./download-queue";
import { getDocument } from "../../api/data/document";
import { downloadFile } from "../../api/data/download";
import { fetchLibgen } from "../../api/data/request";

export interface IBulkDownloadQueueItem extends IDownloadProgress {
  md5: string;
}

// Used only by the CLI `-b` / `-d` modes (see docs/adr/0001-bulk-download-is-cli-only.md).
export interface IBulkDownloadQueueState {
  completedBulkDownloadItemCount: number;
  failedBulkDownloadItemCount: number;

  bulkDownloadQueue: IBulkDownloadQueueItem[];

  onBulkQueueItemProcessing: (index: number) => void;
  onBulkQueueItemStart: (index: number, filename: string, total: number) => void;
  onBulkQueueItemData: (index: number, filename: string, chunk: Buffer, total: number) => void;
  onBulkQueueItemComplete: (index: number) => void;
  onBulkQueueItemFail: (index: number) => void;
  operateBulkDownloadQueue: () => Promise<void>;
  startBulkDownloadInCLI: (md5List: string[]) => Promise<void>;
}

export const initialBulkDownloadQueueState = {
  completedBulkDownloadItemCount: 0,
  failedBulkDownloadItemCount: 0,

  bulkDownloadQueue: [],
};

export const createBulkDownloadQueueStateSlice = (
  set: (
    partial: Partial<TCombinedStore> | ((state: TCombinedStore) => Partial<TCombinedStore>)
  ) => void,
  get: () => TCombinedStore
) => {
  const updateItem = (
    index: number,
    patch: (item: IBulkDownloadQueueItem) => Partial<IBulkDownloadQueueItem>
  ) => {
    set((previous) => ({
      bulkDownloadQueue: previous.bulkDownloadQueue.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }
        return { ...item, ...patch(item) };
      }),
    }));
  };

  return {
    ...initialBulkDownloadQueueState,

    onBulkQueueItemProcessing: (index: number) => {
      updateItem(index, () => ({ status: DownloadStatus.PROCESSING }));
    },

    onBulkQueueItemStart: (index: number, filename: string, total: number) => {
      updateItem(index, () => ({ filename, total, status: DownloadStatus.DOWNLOADING }));
    },

    onBulkQueueItemData: (index: number, filename: string, chunk: Buffer, total: number) => {
      updateItem(index, (item) => ({
        filename,
        total,
        progress: (item.progress || 0) + chunk.length,
      }));
    },

    onBulkQueueItemComplete: (index: number) => {
      updateItem(index, () => ({ status: DownloadStatus.DOWNLOADED }));
      set((previous) => ({
        completedBulkDownloadItemCount: previous.completedBulkDownloadItemCount + 1,
      }));
    },

    onBulkQueueItemFail: (index: number) => {
      updateItem(index, () => ({ status: DownloadStatus.FAILED }));
      set((previous) => ({
        failedBulkDownloadItemCount: previous.failedBulkDownloadItemCount + 1,
      }));
    },

    operateBulkDownloadQueue: async () => {
      const bulkDownloadQueue = get().bulkDownloadQueue;
      for (const [index, item] of bulkDownloadQueue.entries()) {
        const detailPageUrl = get().mirrorAdapter?.getDetailPageURL(item.md5);
        if (!detailPageUrl) {
          get().setWarningMessage(`Couldn't get the detail page URL for ${item.md5}`);
          get().onBulkQueueItemFail(index);
          continue;
        }

        get().onBulkQueueItemProcessing(index);

        const detailPageResult = await attempt((signal) => getDocument(detailPageUrl, signal));
        if (!detailPageResult) {
          get().setWarningMessage(`Couldn't fetch the detail page for ${item.md5}`);
          get().onBulkQueueItemFail(index);
          continue;
        }

        const downloadUrl = get().mirrorAdapter?.getMainDownloadURLFromDocument(
          detailPageResult.document
        );
        if (!downloadUrl) {
          get().setWarningMessage(`Couldn't find the download url for ${item.md5}`);
          get().onBulkQueueItemFail(index);
          continue;
        }

        const downloadStream = await attempt((signal) => fetchLibgen(downloadUrl, signal));
        if (!downloadStream) {
          get().setWarningMessage(`Couldn't fetch the download stream for ${item.md5}`);
          get().onBulkQueueItemFail(index);
          continue;
        }

        try {
          await downloadFile({
            downloadStream,
            directory: get().userConfig.downloadDir,
            onStart: (filename, total) => {
              get().onBulkQueueItemStart(index, filename, total);
            },
            onData: (filename, chunk, total) => {
              get().onBulkQueueItemData(index, filename, chunk, total);
            },
          });

          get().onBulkQueueItemComplete(index);
        } catch {
          get().onBulkQueueItemFail(index);
        }
      }
    },

    startBulkDownloadInCLI: async (md5List: string[]) => {
      set({
        bulkDownloadQueue: md5List.map((md5) => ({
          md5,
          status: DownloadStatus.IN_QUEUE,
          filename: "",
          progress: 0,
          total: 0,
        })),
      });

      await get().operateBulkDownloadQueue();

      get().handleExit();
    },
  };
};
