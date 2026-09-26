import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { sourceFingerprint } from "./scripts/lib/sourceFingerprint.mjs";

/**
 * Build config for the downloadable Offline version (NetFree friendly).
 * - relative base + single IIFE bundle so it runs straight from file://
 * - CDN asset URLs are rewritten to local files bundled in the folder
 * Run through: node scripts/build-offline.mjs
 */
const manifestPath = path.resolve(__dirname, "src/offline/media-manifest.json");
const mediaManifest: Record<string, string> = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  : {};

const localizeAssets = () => ({
  name: "localize-asset-json",
  enforce: "pre" as const,
  transform(code: string, id: string) {
    if (!id.endsWith(".asset.json")) return null;
    try {
      const json = JSON.parse(code) as { url?: string };
      if (json.url && mediaManifest[json.url]) {
        json.url = `./media/${mediaManifest[json.url]}`;
        return { code: JSON.stringify(json), map: null };
      }
    } catch {
      /* leave untouched */
    }
    return null;
  },
});

export default defineConfig({
  base: "./",
  define: {
    "import.meta.env.VITE_OFFLINE_BUILD": '"1"',
    "import.meta.env.VITE_SOURCE_FINGERPRINT": JSON.stringify(sourceFingerprint(__dirname)),
  },
  plugins: [localizeAssets(), react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  build: {
    outDir: "offline-dist",
    emptyOutDir: true,
    modulePreload: false,
    cssCodeSplit: false,
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        format: "iife",
        inlineDynamicImports: true,
        entryFileNames: "app.js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
