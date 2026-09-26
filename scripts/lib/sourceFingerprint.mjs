/**
 * Deterministic fingerprint of the application source.
 *
 * Both builds (the online site and the downloadable Offline build) bake the same
 * value in, and the Offline publish script stores it in the published manifest.
 * The admin dashboard compares the two: if they differ, the Offline version is
 * running older code than the live site and needs a new publish. This is the
 * safety net that makes it impossible for an Offline update to be missed silently.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";

const IGNORED_DIRS = new Set(["node_modules", "dist", "offline-dist", ".git"]);
const TRACKED_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".css",
  ".json",
  ".html",
]);

const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || IGNORED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (TRACKED_EXT.has(path.extname(entry.name))) out.push(full);
  }
  return out;
};

/** Short hex hash of every source file that can change what users see. */
export const sourceFingerprint = (root) => {
  const hash = crypto.createHash("sha256");
  const files = [...walk(path.join(root, "src")), path.join(root, "index.html")]
    .filter((f) => fs.existsSync(f))
    .sort();
  for (const file of files) {
    hash.update(path.relative(root, file).replace(/\\/g, "/"));
    hash.update(fs.readFileSync(file));
  }
  return hash.digest("hex").slice(0, 12);
};
