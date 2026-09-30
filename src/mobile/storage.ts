import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";

// Native side: plugins/libgen-dl-storage.
interface StoragePlugin {
  pickFolder(): Promise<Folder>;
  startKeepAlive(options: { text: string; percent: number }): Promise<void>;
  stopKeepAlive(): Promise<void>;
  // Rejects with "Stopped" after stopDownload. total is -1 when the server doesn't say.
  download(options: { url: string; path: string; label: string; userAgent: string }): Promise<void>;
  stopDownload(): Promise<void>;
  addListener(
    eventName: "downloadProgress",
    listener: (status: { bytes: number; total: number }) => void
  ): Promise<PluginListenerHandle>;
  publish(options: {
    path: string;
    name: string;
    mime: string;
    tree?: string;
  }): Promise<{ uri: string }>;
}

export interface Folder {
  uri: string;
  name: string;
}

export const Storage = registerPlugin<StoragePlugin>("Storage");

const KEY = "libgen-dl.folder";

// undefined = the public Downloads folder
export const getFolder = (): Folder | undefined => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "null") ?? undefined;
  } catch {
    return undefined;
  }
};

export const setFolder = (folder: Folder | undefined) => {
  try {
    if (folder) {
      localStorage.setItem(KEY, JSON.stringify(folder));
      return;
    }
    localStorage.removeItem(KEY);
  } catch {
    // storage unavailable: the choice just won't survive a restart
  }
};

const LANGUAGE_KEY = "libgen-dl.language";

// "" = no preference
export const getLanguage = (): string => {
  try {
    return localStorage.getItem(LANGUAGE_KEY) ?? "";
  } catch {
    return "";
  }
};

export const setLanguage = (language: string) => {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // storage unavailable: the choice just won't survive a restart
  }
};

export const MIME: Record<string, string> = {
  epub: "application/epub+zip",
  pdf: "application/pdf",
  mobi: "application/x-mobipocket-ebook",
  djvu: "image/vnd.djvu",
};

export const mimeFor = (filename: string) =>
  MIME[filename.slice(filename.lastIndexOf(".") + 1).toLowerCase()] ?? "application/octet-stream";
