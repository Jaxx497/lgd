import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ALL_COLUMNS, DEFAULT_COLUMNS, type Column } from "./tui/helpers/table";

export interface UserConfig {
  downloadDir: string;
  extensions: string[]; // empty = show every filetype
  columns: Column[];
  language: string; // list these first; empty = mirror order
  mirror: string | undefined;
}

export interface LoadedConfig {
  config: UserConfig;
  warnings: string[];
}

export const CONFIG_PATH = path.join(os.homedir(), ".config", "libgen-dl", "config.json");
// ponytail: the folder from before the rename to libgen-dl (1.3), moved over on first run. Drop
// once nobody is upgrading from 1.2.
const LEGACY_CONFIG_DIR = path.join(os.homedir(), ".config", "lgd");

export const CONFIG_TEMPLATE = `{
  // Where downloads are saved (default: current directory)
  // "downloadDir": "~/books",

  // Only show these filetypes (default: all)
  // "extensions": ["pdf", "epub"],

  // Results table columns, in order. Also available: language, pages, publisher
  // "columns": ["index", "ext", "title", "authors", "year", "size"],

  // List books in this language first, e.g. "English" (default: mirror order)
  // "language": "English",

  // Preferred mirror, tried first. To find mirrors, see open-slum.org
  // "mirror": "https://libgen.li"
}
`;

export const defaultConfig = (): UserConfig => ({
  downloadDir: process.cwd(),
  extensions: [],
  columns: DEFAULT_COLUMNS,
  language: "",
  mirror: undefined,
});

const expandHome = (value: string) => value.replace(/^~(?=$|[/\\])/, os.homedir());

// "pdf, .EPUB" -> ["pdf", "epub"]; "all" -> []
export const parseExtensions = (values: string[]): string[] =>
  values
    .map((value) => value.trim().toLowerCase().replace(/^\./, ""))
    .filter((value) => value && value !== "all");

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

export function parseUserConfig(text: string): LoadedConfig {
  const config = defaultConfig();
  const warnings: string[] = [];

  let raw: Record<string, unknown>;
  try {
    // ponytail: only whole-line // comments are supported, not trailing or /* */ ones
    raw = JSON.parse(text.replaceAll(/^\s*\/\/.*$/gm, "")) as Record<string, unknown>;
  } catch {
    return { config, warnings: [`config: couldn't parse ${CONFIG_PATH}, using defaults`] };
  }

  if ("downloadDir" in raw) {
    if (typeof raw.downloadDir === "string" && raw.downloadDir.trim()) {
      config.downloadDir = path.resolve(expandHome(raw.downloadDir.trim()));
    } else {
      warnings.push("config: downloadDir must be a path");
    }
  }

  if ("extensions" in raw) {
    if (isStringArray(raw.extensions)) {
      config.extensions = parseExtensions(raw.extensions);
    } else {
      warnings.push('config: extensions must be a list like ["pdf", "epub"]');
    }
  }

  if ("columns" in raw) {
    if (isStringArray(raw.columns)) {
      const known = raw.columns.filter((column): column is Column =>
        (ALL_COLUMNS as readonly string[]).includes(column)
      );
      const unknown = raw.columns.filter((column) => !known.includes(column as Column));
      if (unknown.length > 0) {
        warnings.push(`config: unknown columns ignored: ${unknown.join(", ")}`);
      }
      config.columns = known;
    } else {
      warnings.push("config: columns must be a list of column names");
    }
  }

  if ("language" in raw) {
    if (typeof raw.language === "string") {
      config.language = raw.language.trim();
    } else {
      warnings.push('config: language must be a name like "English"');
    }
  }

  if ("mirror" in raw) {
    try {
      config.mirror = new URL(String(raw.mirror)).toString();
    } catch {
      warnings.push("config: mirror must be a URL like https://libgen.li");
    }
  }

  return { config, warnings };
}

// Creates the commented template on first run; never overwrites an existing file.
export function loadUserConfig(
  configPath = CONFIG_PATH,
  legacyDirectory = LEGACY_CONFIG_DIR
): LoadedConfig {
  const warnings: string[] = [];
  if (!fs.existsSync(path.dirname(configPath)) && fs.existsSync(legacyDirectory)) {
    try {
      fs.renameSync(legacyDirectory, path.dirname(configPath));
    } catch {
      // left where it is: the defaults below still work
    }
  }
  try {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, CONFIG_TEMPLATE, { flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      warnings.push(`config: couldn't create ${configPath}, using defaults`);
      return { config: defaultConfig(), warnings };
    }
  }

  try {
    return parseUserConfig(fs.readFileSync(configPath, "utf8"));
  } catch {
    return { config: defaultConfig(), warnings: [`config: couldn't read ${configPath}`] };
  }
}

// CLI flags win over the config file. `-e all` clears a configured filter.
export function applyFlags(
  config: UserConfig,
  flags: { ext?: string; output?: string; language?: string }
): UserConfig {
  const result = { ...config };
  if (flags.ext !== undefined) {
    result.extensions = parseExtensions(flags.ext.split(","));
  }
  if (flags.language !== undefined) {
    result.language = flags.language.trim();
  }
  if (flags.output) {
    result.downloadDir = path.resolve(expandHome(flags.output));
  }
  return result;
}
