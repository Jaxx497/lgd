import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Writable } from "node:stream";
import {
  downloadFile,
  removePartialDownloads,
  reserveUniquePath,
} from "../src/api/data/download";

const createResponse = (filename: string, chunks: Uint8Array[]) => {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });

  return new Response(body, {
    headers: {
      "content-disposition": `attachment; filename="${filename}"`,
      "content-length": String(chunks.reduce((total, chunk) => total + chunk.length, 0)),
    },
  });
};

let directory: string;

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "lgd-test-"));
});

afterEach(() => {
  mock.restore();
  fs.rmSync(directory, { recursive: true, force: true });
});

describe("downloadFile", () => {
  it("writes every response chunk and reports progress", async () => {
    const onStart = mock(() => {});
    const onData = mock(() => {});
    const chunks = [Buffer.from("first "), Buffer.from("second")];

    const result = await downloadFile({
      downloadStream: createResponse("example.epub", chunks),
      onStart,
      onData,
      directory,
    });

    expect(result).toEqual({
      path: path.join(directory, "example.epub"),
      filename: "example.epub",
      total: 12,
    });
    expect(fs.readFileSync(result.path, "utf8")).toBe("first second");
    expect(onStart).toHaveBeenCalledWith("example.epub", 12);
    expect(onData).toHaveBeenCalledTimes(2);
  });

  it("rejects when the response has no content-disposition header", async () => {
    await expect(
      downloadFile({
        downloadStream: new Response("content"),
        onStart() {},
        onData() {},
      })
    ).rejects.toThrow("No content-disposition header found");
  });

  it("handles a destroyed destination without writing to it again", async () => {
    const destination = new Writable({
      write(_chunk, _encoding, callback) {
        setTimeout(() => {
          destination.destroy();
        }, 0);
        callback();
      },
    });
    spyOn(fs, "createWriteStream").mockReturnValue(destination as fs.WriteStream);

    let cancelled = false;
    let pullCount = 0;
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        if (pullCount === 0) {
          pullCount += 1;
          controller.enqueue(Buffer.alloc(1024));
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 20));
        if (!cancelled) {
          controller.enqueue(Buffer.alloc(1024));
          controller.close();
        }
      },
      cancel() {
        cancelled = true;
      },
    });
    const downloadStream = new Response(body, {
      headers: {
        "content-disposition": 'attachment; filename="broken.epub"',
        "content-length": "2048",
      },
    });

    await expect(
      downloadFile({
        downloadStream,
        onStart() {},
        onData() {},
        directory,
      })
    ).rejects.toThrow("(broken.epub) Error occurred while downloading file");
    expect(fs.readdirSync(directory)).toEqual([]);
  });

  it("never overwrites: adds (1), (2) before the extension", async () => {
    fs.writeFileSync(path.join(directory, "book.epub"), "original");
    fs.writeFileSync(path.join(directory, "book(1).epub"), "original");

    const result = await downloadFile({
      downloadStream: createResponse("book.epub", [Buffer.from("new")]),
      onStart() {},
      onData() {},
      directory,
    });

    expect(result.filename).toBe("book(2).epub");
    expect(fs.readFileSync(path.join(directory, "book.epub"), "utf8")).toBe("original");
    expect(fs.readFileSync(result.path, "utf8")).toBe("new");
  });

  it("keeps the mirror's filename inside the target directory", async () => {
    const result = await downloadFile({
      downloadStream: createResponse("../../escape.pdf", [Buffer.from("x")]),
      onStart() {},
      onData() {},
      directory,
    });

    expect(result.path).toBe(path.join(directory, "escape.pdf"));
  });

  it("truncates long names from the end, keeping the start and the extension", async () => {
    const result = await downloadFile({
      downloadStream: createResponse(`Start ${"x".repeat(300)}.epub`, [Buffer.from("x")]),
      onStart() {},
      onData() {},
      directory,
    });

    expect(result.filename).toHaveLength(128);
    expect(result.filename.startsWith("Start ")).toBe(true);
    expect(result.filename.endsWith(".epub")).toBe(true);
  });
});

describe("reserveUniquePath", () => {
  it("suffixes names without an extension at the end", async () => {
    fs.writeFileSync(path.join(directory, "README"), "");
    expect(await reserveUniquePath(directory, "README")).toBe(path.join(directory, "README(1)"));
  });

  it("keeps the extension of a truncated long name", async () => {
    const long = `${"a".repeat(124)}.pdf`;
    fs.writeFileSync(path.join(directory, long), "");
    const reserved = await reserveUniquePath(directory, long);
    expect(path.basename(reserved)).toBe(`${"a".repeat(124)}(1).pdf`);
  });
});

describe("removePartialDownloads", () => {
  it("deletes files that are still being written", async () => {
    const gate = Promise.withResolvers<void>();
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        controller.enqueue(Buffer.from("partial"));
        await gate.promise;
        controller.close();
      },
    });
    const pending = downloadFile({
      downloadStream: new Response(body, {
        headers: { "content-disposition": 'attachment; filename="slow.epub"' },
      }),
      onStart() {},
      onData() {},
      directory,
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fs.existsSync(path.join(directory, "slow.epub"))).toBe(true);

    removePartialDownloads();
    expect(fs.existsSync(path.join(directory, "slow.epub"))).toBe(false);

    gate.resolve();
    await pending.catch(() => {});
  });
});
