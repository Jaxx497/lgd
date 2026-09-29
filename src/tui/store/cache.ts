import type { GetState, SetState } from "./index";
import { Entry } from "../../api/models/entry";

export interface ICacheState {
  entryCacheMap: Record<string, Entry[]>;
  setEntryCacheMap: (searchURL: string, entryList: Entry[]) => void;
  resetEntryCacheMap: () => void;
}

export const initialCacheState = {
  entryCacheMap: {},
};

export const createCacheStateSlice = (set: SetState, get: GetState) => ({
  ...initialCacheState,

  setEntryCacheMap: (searchURL: string, entryList: Entry[]) => {
    const store = get();

    const entryCacheMap = {
      ...store.entryCacheMap,
      [searchURL]: entryList,
    };

    set({ entryCacheMap });
  },

  resetEntryCacheMap: () => {
    set({
      entryCacheMap: {},
    });
  },
});
