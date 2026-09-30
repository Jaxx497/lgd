import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  applyFlags,
  CONFIG_TEMPLATE,
  defaultConfig,
  loadUserConfig,
  parseUserConfig,
} from "../src/user-config";

let directory: string;

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "lgd-config-"));
});

afterEach(() => {
  fs.rmSync(directory, { recursive: true, force: true });
});

describe("parseUserConfig", () => {
  it("reads the untouched template as all defaults", () => {
    expect(parseUserConfig(CONFIG_TEMPLATE)).toEqual({ config: defaultConfig(), warnings: [] });
  });

  it("reads every key, ignoring whole-line comments", () => {
    const { config, warnings } = parseUserConfig(`{
      // comment with "quotes": [1, 2]
      "downloadDir": "~/books",
      "extensions": [".PDF", "epub"],
      "columns": ["index", "title", "language"],
      "mirror": "https://libgen.example"
    }`);

    expect(warnings).toEqual([]);
    expect(config).toEqual({
      downloadDir: path.join(os.homedir(), "books"),
      extensions: ["pdf", "epub"],
      columns: ["index", "title", "language"],
      mirror: "https://libgen.example/",
    });
  });

  it("falls back to defaults with one warning when the file isn't JSON", () => {
    const { config, warnings } = parseUserConfig("{ nope");
    expect(config).toEqual(defaultConfig());
    expect(warnings).toHaveLength(1);
  });

  it("resets only the bad key, and warns about it", () => {
    const { config, warnings } = parseUserConfig(
      '{ "extensions": "pdf", "columns": ["title", "colour"], "mirror": "not a url" }'
    );
    expect(config.extensions).toEqual([]);
    expect(config.columns).toEqual(["title"]);
    expect(config.mirror).toBeUndefined();
    expect(warnings).toHaveLength(3);
  });

  it("resolves a relative downloadDir against the current directory", () => {
    expect(parseUserConfig('{ "downloadDir": "books" }').config.downloadDir).toBe(
      path.resolve("books")
    );
  });
});

describe("loadUserConfig", () => {
  it("creates the commented template on first run", () => {
    const configPath = path.join(directory, "lgd", "config.json");
    expect(loadUserConfig(configPath).config).toEqual(defaultConfig());
    expect(fs.readFileSync(configPath, "utf8")).toBe(CONFIG_TEMPLATE);
  });

  it("never overwrites an existing file", () => {
    const configPath = path.join(directory, "config.json");
    fs.writeFileSync(configPath, '{ "extensions": ["pdf"] }');
    expect(loadUserConfig(configPath).config.extensions).toEqual(["pdf"]);
    expect(fs.readFileSync(configPath, "utf8")).toBe('{ "extensions": ["pdf"] }');
  });
});

describe("applyFlags", () => {
  const configured = { ...defaultConfig(), extensions: ["pdf"] };

  it("keeps the config when no flags are given", () => {
    expect(applyFlags(configured, {})).toEqual(configured);
  });

  it("lets -e replace the configured filter, and -e all clear it", () => {
    expect(applyFlags(configured, { ext: "epub, .MOBI" }).extensions).toEqual(["epub", "mobi"]);
    expect(applyFlags(configured, { ext: "all" }).extensions).toEqual([]);
  });

  it("lets -o set the download directory", () => {
    expect(applyFlags(configured, { output: "~/x" }).downloadDir).toBe(
      path.join(os.homedir(), "x")
    );
  });
});
