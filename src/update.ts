import { version } from "../package.json";

export const REPO_URL = "https://github.com/Jaxx497/libgen-dl";
const LATEST_URL = "https://api.github.com/repos/Jaxx497/libgen-dl/releases/latest";

const parts = (value: string) => value.replace(/^v/, "").split(".").map(Number);

// "1.2.10" > "1.2.9"; anything unparsable counts as not newer
export const isNewer = (latest: string, current: string): boolean => {
  const [a, b] = [parts(latest), parts(current)];
  for (let index = 0; index < 3; index++) {
    if (!(a[index] >= 0) || !(b[index] >= 0)) {
      return false;
    }
    if (a[index] !== b[index]) {
      return a[index] > b[index];
    }
  }
  return false;
};

// The newer version's number, or undefined if up to date or the check failed (offline, rate limit).
export async function fetchNewerVersion(): Promise<string | undefined> {
  try {
    const response = await fetch(LATEST_URL, { signal: AbortSignal.timeout(5000) });
    const { tag_name } = (await response.json()) as { tag_name?: string };
    if (tag_name && isNewer(tag_name, version)) {
      return tag_name.replace(/^v/, "");
    }
  } catch {
    // no update notice: not worth bothering anyone
  }
  return undefined;
}

export { version } from "../package.json";
