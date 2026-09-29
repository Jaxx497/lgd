import { filesize } from "filesize";
import { DownloadStatus } from "../../download-statuses";
import type { IDownloadProgress } from "../store/download-queue";

export const getDownloadProgress = (progress: number, total: number) => {
  let rawPercentage = 0;
  if (total !== 0) {
    rawPercentage = (progress / total) * 100;
  }
  const progressPercentage = rawPercentage.toFixed(2);

  const downloadedSize = filesize(progress, {
    base: 2,
    standard: "jedec",
  });

  const totalSize = filesize(total, {
    base: 2,
    standard: "jedec",
  });

  return {
    progressPercentage,
    downloadedSize,
    totalSize,
  };
};

// Compact status shown before the title in the results table.
export const shortStatus = (download: IDownloadProgress | undefined): string => {
  switch (download?.status) {
    case undefined:
    case DownloadStatus.IDLE: {
      return "";
    }
    case DownloadStatus.IN_QUEUE: {
      return "⧗";
    }
    case DownloadStatus.DOWNLOADING: {
      return `⬇${getDownloadProgress(download.progress || 0, download.total).progressPercentage.split(".")[0]}%`;
    }
    case DownloadStatus.DOWNLOADED: {
      return "✓";
    }
    case DownloadStatus.FAILED: {
      return "✗";
    }
    default: {
      return "…";
    }
  }
};
