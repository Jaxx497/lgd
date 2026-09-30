// Mobile stand-in for user-config.ts: no config file, just the defaults.
import { DEFAULT_COLUMNS } from "../../tui/helpers/table";
import type { UserConfig } from "../../user-config";

export type { UserConfig } from "../../user-config";

export const defaultConfig = (): UserConfig => ({
  downloadDir: "",
  extensions: [],
  columns: DEFAULT_COLUMNS,
  language: "",
  mirror: undefined,
});
