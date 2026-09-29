import { TCombinedStore } from "./index";
import { Entry } from "../../api/models/entry";
import { LAYOUT_KEY } from "../layouts/keys";
import { clearScreen } from "../helpers/screen";

// ready: more pages; partial: this page is short but more matches may exist; unavailable: last page
export type NextPageStatus = "idle" | "ready" | "partial" | "unavailable";

export type MirrorCheckStatus = "pending" | "checking" | "ok" | "failed";

export interface MirrorCheckState {
  src: string;
  status: MirrorCheckStatus;
}

export interface IAppState {
  CLIMode: boolean;

  isLoading: boolean;
  quitPromptVisible: boolean;
  isEditingFilter: boolean;

  loaderMessage: string;
  searchValue: string;
  errorMessage: string | undefined;
  warningMessage: string | undefined;
  warningTimeout: NodeJS.Timeout | undefined;

  currentPage: number;
  cursor: number;

  detailedEntry: Entry | undefined;
  entries: Entry[];
  activeLayout: LAYOUT_KEY;

  nextPageStatus: NextPageStatus;
  connectionError: string | undefined;
  mirrorCheckStates: MirrorCheckState[];

  setCLIMode: (CLIMode: boolean) => void;

  setIsLoading: (isLoading: boolean) => void;
  setQuitPromptVisible: (quitPromptVisible: boolean) => void;
  setIsEditingFilter: (isEditingFilter: boolean) => void;

  setLoaderMessage: (loaderMessage: string) => void;
  setSearchValue: (searchValue: string) => void;
  setErrorMessage: (errorMessage: string | undefined) => void;
  setWarningMessage: (warningMessage: string | undefined) => void;

  setCurrentPage: (currentPage: number) => void;
  setCursor: (cursor: number) => void;

  setDetailedEntry: (detailedEntry: Entry | undefined) => void;
  setEntries: (entries: Entry[]) => void;
  setActiveLayout: (activeLayout: LAYOUT_KEY) => void;

  setNextPageStatus: (nextPageStatus: NextPageStatus) => void;
  setConnectionError: (connectionError: string | undefined) => void;
  setMirrorCheckStates: (mirrorCheckStates: MirrorCheckState[]) => void;

  resetAppState: () => void;
}

export const initialAppState = {
  isLoading: false,
  quitPromptVisible: false,
  isEditingFilter: false,

  loaderMessage: "",
  searchValue: "",
  errorMessage: undefined,
  warningMessage: undefined,
  warningTimeout: undefined,

  currentPage: 1,
  cursor: 0,

  detailedEntry: undefined,
  entries: [] as Entry[],
  activeLayout: LAYOUT_KEY.SEARCH_LAYOUT,

  nextPageStatus: "idle" as NextPageStatus,
  connectionError: undefined as string | undefined,
  mirrorCheckStates: [] as MirrorCheckState[],
};

export const createAppStateSlice = (
  set: (
    partial: Partial<TCombinedStore> | ((state: TCombinedStore) => Partial<TCombinedStore>)
  ) => void,
  get: () => TCombinedStore
) => ({
  CLIMode: false,
  setCLIMode: (CLIMode: boolean) => set({ CLIMode }),

  ...initialAppState,

  setIsLoading: (isLoading: boolean) => set({ isLoading }),
  setQuitPromptVisible: (quitPromptVisible: boolean) => set({ quitPromptVisible }),
  setIsEditingFilter: (isEditingFilter: boolean) => set({ isEditingFilter }),

  setLoaderMessage: (loaderMessage: string) => set({ loaderMessage }),
  setSearchValue: (searchValue: string) => set({ searchValue }),
  setErrorMessage: (errorMessage: string | undefined) => set({ errorMessage }),
  setWarningMessage: (warningMessage: string | undefined) => {
    const WARNING_DURATION = 5000;

    const timeout = get().warningTimeout;
    if (timeout) {
      clearTimeout(timeout);
    }

    set({ warningMessage });
    const newTimeout = setTimeout(() => {
      set({ warningMessage: undefined });
    }, WARNING_DURATION);
    set({ warningTimeout: newTimeout });
  },

  setCurrentPage: (currentPage: number) => set({ currentPage }),
  setCursor: (cursor: number) => set({ cursor }),

  setDetailedEntry: (detailedEntry: Entry | undefined) => set({ detailedEntry }),
  setEntries: (entries: Entry[]) => set({ entries }),
  setActiveLayout: (activeLayout: LAYOUT_KEY) => {
    const store = get();
    if (!store.CLIMode) {
      clearScreen();
    }

    set({ activeLayout });
  },

  setNextPageStatus: (nextPageStatus: NextPageStatus) => set({ nextPageStatus }),
  setConnectionError: (connectionError: string | undefined) => set({ connectionError }),
  setMirrorCheckStates: (mirrorCheckStates: MirrorCheckState[]) => set({ mirrorCheckStates }),

  resetAppState: () => set(initialAppState),
});
