import { LIBGEN_USER_AGENT } from "../../settings";

// Every mirror request goes through here. HTTP errors throw, so `attempt` retries them and an
// error page is never parsed as "no results".
export async function fetchLibgen(
  input: RequestInfo | URL,
  signal: AbortSignal
): Promise<Response> {
  const response = await fetch(input, {
    headers: {
      "User-Agent": LIBGEN_USER_AGENT,
    },
    signal,
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${input.toString()}`);
  }
  return response;
}
