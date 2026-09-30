import { registerPlugin } from "@capacitor/core";

// Native side: plugins/lgd-storage.
interface StoragePlugin {
  pickFolder(): Promise<Folder>;
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

const KEY = "lgd.folder";

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

export const MIME: Record<string, string> = {
  epub: "application/epub+zip",
  pdf: "application/pdf",
  mobi: "application/x-mobipocket-ebook",
  djvu: "image/vnd.djvu",
};

export const mimeFor = (filename: string) =>
  MIME[filename.slice(filename.lastIndexOf(".") + 1).toLowerCase()] ?? "application/octet-stream";
