import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { sourceFingerprint } from "./scripts/lib/sourceFingerprint.mjs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    // Lets the admin dashboard tell whether the Offline version runs this code.
    "import.meta.env.VITE_SOURCE_FINGERPRINT": JSON.stringify(sourceFingerprint(__dirname)),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
