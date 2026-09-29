// Bundles the mobile app into www/ for Capacitor. The store and api layers are shared with the
// TUI; the three modules that touch Node (files, config file, terminal) are swapped for mobile ones.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dir, "..");
const swaps: Record<string, string> = {
  "src/api/data/download": "src/mobile/stubs/download.ts",
  "src/user-config": "src/mobile/stubs/user-config.ts",
  "src/tui/helpers/screen": "src/mobile/stubs/screen.ts",
};

const result = await Bun.build({
  entrypoints: [path.join(root, "src/mobile/main.tsx")],
  outdir: path.join(root, "www"),
  target: "browser",
  minify: true,
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [
    {
      name: "mobile-swaps",
      setup(build) {
        build.onResolve({ filter: /\/(download|user-config|screen)$/ }, (args) => {
          const resolved = path.relative(root, path.resolve(path.dirname(args.importer), args.path));
          const swap = swaps[resolved];
          return swap ? { path: path.join(root, swap) } : undefined;
        });
      },
    },
  ],
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
for (const file of ["index.html", "style.css"]) {
  fs.copyFileSync(path.join(root, "src/mobile", file), path.join(root, "www", file));
}
