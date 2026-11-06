import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

const browserDevAliases = [
  { find: /^@tauri-apps\/api\/core$/, replacement: path.resolve(__dirname, "./src/dev/browser/core.ts") },
  { find: /^@tauri-apps\/api\/event$/, replacement: path.resolve(__dirname, "./src/dev/browser/event.ts") },
  { find: /^@tauri-apps\/api\/app$/, replacement: path.resolve(__dirname, "./src/dev/browser/app.ts") },
  { find: /^@tauri-apps\/plugin-dialog$/, replacement: path.resolve(__dirname, "./src/dev/browser/dialog.ts") },
];

// Dev-only chrome: never part of a production bundle.
const browserBanner = (): Plugin => ({
  name: "jobdex-browser-dev-banner",
  apply: "serve",
  transformIndexHtml() {
    return [
      {
        tag: "script",
        attrs: { type: "module", src: "/src/dev/browser/banner.ts" },
        injectTo: "body",
      },
    ];
  },
});

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const browser = mode === "browser";

  if (browser && command === "build") {
    throw new Error(
      'Browser development mode is serve-only. Run "bun run dev:browser" (vite --mode browser); production builds must use "bun run build" without --mode browser.',
    );
  }

  const browserServe = browser && command === "serve";

  return {
    plugins: browserServe ? [react(), browserBanner()] : [react()],
    resolve: {
      alias: browserServe
        ? [...browserDevAliases, { find: "@", replacement: path.resolve(__dirname, "./src") }]
        : { "@": path.resolve(__dirname, "./src") },
    },

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent Vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: browserServe
      ? {
        port: 1422,
        strictPort: true,
        host: "127.0.0.1",
        watch: {
          // 3. tell Vite to ignore watching `src-tauri`
          ignored: ["**/src-tauri/**"],
        },
      }
      : {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host
          ? {
            protocol: "ws",
            host,
            port: 1421,
          }
          : undefined,
        watch: {
          // 3. tell Vite to ignore watching `src-tauri`
          ignored: ["**/src-tauri/**"],
        },
      },
  };
});
