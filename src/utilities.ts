import { FAIL_REQ_ATTEMPT_COUNT, FAIL_REQ_ATTEMPT_DELAY_MS, REQUEST_TIMEOUT_MS } from "./settings";

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
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
      return await callback(controller.signal);
    } catch {
      // retried below
    } finally {
      clearTimeout(timeout);
    }

    if (index + 1 < attemptCount && !options.signal?.aborted) {
      await delay(delayMs);
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
