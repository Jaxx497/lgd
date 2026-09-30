import { FAIL_REQ_ATTEMPT_COUNT, FAIL_REQ_ATTEMPT_DELAY_MS, REQUEST_TIMEOUT_MS } from "./settings";

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

// Settles once the signal aborts; never without one.
function whenAborted(signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
    }
    signal?.addEventListener("abort", () => resolve(), { once: true });
  });
}

export interface AttemptOptions {
  attemptCount?: number;
  delayMs?: number;
  timeoutMs?: number;
  // Aborting it stops the current try and any retries. It stays wired to the returned value's
  // request too, so a response body still streaming can be stopped with it.
  signal?: AbortSignal;
}

export async function attempt<T>(
  callback: (signal: AbortSignal) => Promise<T>,
  options: AttemptOptions = {}
): Promise<T | undefined> {
  const attemptCount = options.attemptCount ?? FAIL_REQ_ATTEMPT_COUNT;
  const delayMs = options.delayMs ?? FAIL_REQ_ATTEMPT_DELAY_MS;
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;

  for (let index = 0; index < attemptCount; index++) {
    if (options.signal?.aborted) {
      return undefined;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    options.signal?.addEventListener("abort", () => controller.abort(), { once: true });

    try {
      // Raced against the stop signal: not every request honors its signal (the Android build's
      // native HTTP ignores it), and a stop must not wait for one to finish on its own.
      return await Promise.race([
        callback(controller.signal),
        whenAborted(options.signal).then(() => {
          throw new Error("Stopped");
        }),
      ]);
    } catch {
      // retried below
    } finally {
      clearTimeout(timeout);
    }

    if (index + 1 < attemptCount) {
      await Promise.race([delay(delayMs), whenAborted(options.signal)]);
    }
  }

  return undefined;
}

export function clearText(text: string): string {
  return text
    .split("\n")[0] // later lines hold image sizes / ISBNs
    .replaceAll(/\s+/g, " ")
    .trim();
}
