import { Entry } from "../models/entry";

export abstract class Adapter {
  abstract baseURL: string;

  abstract parseEntries(
    document: Document,
    throwError?: (message: string) => void
  ): Entry[] | undefined;
  abstract getPageURL(pathname: string): string;
  abstract getSearchURL(query: string, pageNumber: number, pageSize: number): string;
  abstract getDetailPageURL(md5: string): string;
  abstract getMainDownloadURLFromDocument(
    document: Document,
    throwError?: (message: string) => void
  ): string | undefined;
  abstract detectConnectionError(document: Document): string | undefined;
}
