import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.jaxx497.libgendl",
  appName: "LibgenDL",
  webDir: "www",
  // Native HTTP for fetch: LibGen mirrors send no CORS headers.
  plugins: { CapacitorHttp: { enabled: true } },
};

export default config;
