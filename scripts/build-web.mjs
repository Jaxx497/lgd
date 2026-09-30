// Bundles the mobile app into www/ for Capacitor. The store and api layers are shared with the
// TUI; the three modules that touch Node (files, config file, terminal) are swapped for mobile ones.
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const swaps = {
  "src/api/data/download": "src/mobile/stubs/download.ts",
  "src/user-config": "src/mobile/stubs/user-config.ts",
  "src/tui/helpers/screen": "src/mobile/stubs/screen.ts",
};

await build({
  entryPoints: [path.join(root, "src/mobile/main.tsx")],
  outfile: path.join(root, "www/main.js"),
  bundle: true,
  platform: "browser",
  format: "esm",
  target: "es2022",
  minify: true,
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [
    {
      name: "mobile-swaps",
      setup(b) {
        b.onResolve({ filter: /\/(download|user-config|screen)$/ }, (args) => {
          const resolved = path.relative(root, path.resolve(args.resolveDir, args.path));
          const swap = swaps[resolved];
          return swap ? { path: path.join(root, swap) } : undefined;
        });
      },
    },
  ],
});

for (const file of ["index.html", "style.css"]) {
  fs.copyFileSync(path.join(root, "src/mobile", file), path.join(root, "www", file));
}
