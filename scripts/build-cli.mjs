// Bundles the CLI into build/index.js: one file, runs on Node 20+.
import { build } from "esbuild";
import fs from "node:fs";

await build({
  entryPoints: ["src/index.ts"],
  outfile: "build/index.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  // Ink loads react-devtools-core only when DEV=true; a stub keeps it out of the bundle.
  alias: { "react-devtools-core": "./scripts/devtools-stub.js" },
  // Some bundled dependencies still call require().
  banner: {
    js: "#!/usr/bin/env node\nimport { createRequire as __libgenDlCreateRequire } from 'node:module'; const require = __libgenDlCreateRequire(import.meta.url);",
  },
});
fs.chmodSync("build/index.js", 0o755);
