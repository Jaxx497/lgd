import contentDisposition from "content-disposition";
import fs from "node:fs";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { DownloadResult } from "../models/download-result";

interface downloadFileArguments {
  downloadStream: Response;
  onStart: (filename: string, total: number) => void;
  onData: (filename: string, chunk: Buffer, total: number) => void;
  directory?: string;
}

// Files currently being written, so quitting mid-download can remove them.
const inProgressPaths = new Set<string>();

export function removePartialDownloads() {
  for (const filePath of inProgressPaths) {
    fs.rmSync(filePath, { force: true });
  }
}

// Reserve `name`, or `name(1)`, `name(2)`... if taken. The `wx` flag makes check-and-create atomic.
export async function reserveUniquePath(directory: string, filename: string): Promise<string> {
  await fs.promises.mkdir(directory, { recursive: true });
  const { name, ext } = path.parse(filename);
  let candidate = path.join(directory, filename);
  for (let index = 1; ; index++) {
    try {
      await fs.promises.writeFile(candidate, "", { flag: "wx" });
      return candidate;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
    }
    candidate = path.join(directory, `${name}(${index})${ext}`);
  }
}

export const downloadFile = async ({
  downloadStream,
  onStart,
  onData,
  directory = ".",
}: downloadFileArguments): Promise<DownloadResult> => {
  const MAX_FILE_NAME_LENGTH = 128;

  const downloadContentDisposition = downloadStream.headers.get("content-disposition");
  if (!downloadContentDisposition) {
    throw new Error("No content-disposition header found");
  }

  const parsedContentDisposition = contentDisposition.parse(downloadContentDisposition);
  // basename: the name comes from the mirror, never let it escape `directory`
  const fullFileName = path.basename(parsedContentDisposition.parameters.filename).trim();
  const { name, ext } = path.parse(fullFileName);
  const slicedFileName = name.slice(0, MAX_FILE_NAME_LENGTH - ext.length).trimEnd() + ext;

  const total = Number(downloadStream.headers.get("content-length") || 0);

  if (!downloadStream.body) {
    throw new Error("No response body");
  }

  const filePath = await reserveUniquePath(directory, slicedFileName);
  const filename = path.basename(filePath);

  onStart(filename, total);

  const progressStream = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      const buffer = Buffer.from(chunk);
      onData(filename, buffer, total);
      callback(undefined, buffer);
    },
  });

  inProgressPaths.add(filePath);
  try {
    await pipeline(
      Readable.from(downloadStream.body, { objectMode: false }),
      progressStream,
      fs.createWriteStream(filePath)
    );

    const downloadResult: DownloadResult = {
      path: filePath,
      filename,
      total,
    };

    return downloadResult;
  } catch {
    await fs.promises.rm(filePath, { force: true });
    throw new Error(`(${filename}) Error occurred while downloading file`);
  } finally {
    inProgressPaths.delete(filePath);
  }
};
