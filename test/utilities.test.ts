import { describe, expect, it } from "vitest";
import { attempt } from "../src/utilities";

describe("attempt", () => {
  it("gives up at once when stopped, even if the request ignores its signal", async () => {
    const stop = new AbortController();
    let calls = 0;
    const result = attempt(
      () => {
        calls++;
        return new Promise<string>(() => {}); // like the Android build's native HTTP: never aborts
      },
      { attemptCount: 5, delayMs: 60_000, timeoutMs: 60_000, signal: stop.signal }
    );

    stop.abort();

    expect(await result).toBeUndefined();
    expect(calls).toBe(1);
  });

  it("aborts timed-out work and retries with a fresh signal", async () => {
    const signals: AbortSignal[] = [];

    const result = await attempt(
      (signal) => {
        signals.push(signal);
        if (signals.length > 1) {
          return Promise.resolve("success");
        }

        return new Promise<string>((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), { once: true });
        });
      },
      { attemptCount: 2, delayMs: 0, timeoutMs: 5 }
    );

    expect(result).toBe("success");
    expect(signals).toHaveLength(2);
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
    expect(signals[0]).not.toBe(signals[1]);
  });

  it("does not abort a response body after the fetch attempt completes", async () => {
    let completedSignal: AbortSignal | undefined;

    const response = await attempt(
      async (signal) => {
        completedSignal = signal;
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            signal.addEventListener(
              "abort",
              () => controller.error(new Error("download was aborted")),
              { once: true }
            );

            setTimeout(() => {
              controller.enqueue(Buffer.from("downloaded content"));
              controller.close();
            }, 10);
          },
        });

        return new Response(body);
      },
      { attemptCount: 1, delayMs: 0, timeoutMs: 5 }
    );

    await expect(response?.text()).resolves.toBe("downloaded content");
    expect(completedSignal?.aborted).toBe(false);
  });
});
