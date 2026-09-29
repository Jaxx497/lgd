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
  onFail?: (message: string) => void;
  onError?: (message: string) => void;
  onComplete?: () => void;
}

export async function attempt<T>(
  callback: (signal: AbortSignal) => Promise<T>,
  options: AttemptOptions = {}
): Promise<T | undefined> {
  const attemptCount = options.attemptCount ?? FAIL_REQ_ATTEMPT_COUNT;
  const delayMs = options.delayMs ?? FAIL_REQ_ATTEMPT_DELAY_MS;
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;

  for (let index = 0; index < attemptCount; index++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let failure: unknown;

    try {
      const result = await callback(controller.signal);

      if (options.onComplete) {
        options.onComplete();
      }

      return result;
    } catch (error: unknown) {
      failure = error;
    } finally {
      clearTimeout(timeout);
    }

    if (options.onFail) {
      options.onFail(`Request failed, trying again ${index + 1}/${attemptCount}`);
    }

    const isLastAttempt = index + 1 === attemptCount;
    if (isLastAttempt) {
      if (options.onError) {
        options.onError((failure as Error)?.message);
      }
    } else {
      await delay(delayMs);
    }
  }

  return undefined;
}

export function clearText(text: string): string {
  return text
    .split("\n")[0]
    .replaceAll(/<script[^>]*>[\s\S]*?<\/script>/g, "")
    .replaceAll(/<[^>]+>/g, "")
    .replaceAll(/\s+/g, " ")
    .trim();
}
