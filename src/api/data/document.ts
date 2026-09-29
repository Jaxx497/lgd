import { parseHTML } from "linkedom";
import { fetchLibgen } from "./request";

export async function getDocument(url: string, signal: AbortSignal): Promise<Document> {
  try {
    const response = await fetchLibgen(url, signal);
    return parseHTML(await response.text()).document as unknown as Document;
  } catch (error) {
    throw new Error(`Error occurred while fetching document of ${url}`, { cause: error });
  }
}
