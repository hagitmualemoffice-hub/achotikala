#!/usr/bin/env node
/**
 * Publishes offline-cdn/ to the dedicated repo (hagitmualemoffice-hub/achotikala-offline)
 * as ONE squashed commit with force-push, so git history never accumulates and the repo
 * stays far below jsDelivr's 50MB limit. Pruning = whatever pack-offline.mjs left in
 * offline-cdn/ (current + previous version parts) is exactly what the repo holds.
 *
 * Does NOT touch chunking/format — it only copies the already-packed files.
 * Uses the GitHub connector gateway (needs LOVABLE_API_KEY + GITHUB_API_KEY in env).
 *
 *   node scripts/publish-offline-repo.mjs [--dry-run] [--extra dir=destPrefix]
 */
import fs from "node:fs";
import path from "node:path";

const OWNER = "hagitmualemoffice-hub";
const REPO = "achotikala-offline";
const BRANCH = "main";
const CDN_PATH = "offline-cdn";
const MAX_BYTES = 45 * 1024 * 1024; // stop & warn before jsDelivr's 50MB
const BATCH_BYTES = 3 * 1024 * 1024;
const GW = "https://connector-gateway.lovable.dev/github";

const args = process.argv.slice(2);
const dry = args.includes("--dry-run");
const extras = args.flatMap((a, i) => (a === "--extra" ? [args[i + 1]] : [])).filter(Boolean);

const { LOVABLE_API_KEY, GITHUB_API_KEY } = process.env;
if (!dry && (!LOVABLE_API_KEY || !GITHUB_API_KEY)) {
  console.error("Missing LOVABLE_API_KEY / GITHUB_API_KEY");
  process.exit(1);
}

async function gh(method, p, body) {
  const res = await fetch(`${GW}/${p}`, {
    method,
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GITHUB_API_KEY,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${p} -> ${res.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}

function walk(dir, prefix) {
  const out = [];
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    const rel = `${prefix}/${name}`;
    if (fs.statSync(full).isDirectory()) out.push(...walk(full, rel));
    else out.push({ path: rel, full });
  }
  return out;
}

const files = walk(path.resolve(CDN_PATH), CDN_PATH);
for (const e of extras) {
  const [src, dest] = e.split("=");
  files.push(...walk(path.resolve(src), dest || path.basename(src)));
}
files.push({
  path: "README.md",
  content:
    "# achotikala-offline\n\nOffline update channel for Achoti Kalah, served via jsDelivr.\n" +
    "Auto-published by scripts/publish-offline-repo.mjs as a single squashed commit (force-push). Do not edit by hand.\n",
});

let total = 0;
for (const f of files) {
  if (f.full) {
    const buf = fs.readFileSync(f.full);
    if (buf.includes(0)) throw new Error(`Binary file not supported: ${f.path}`);
    f.content = buf.toString("utf8");
  }
  total += Buffer.byteLength(f.content);
}
console.log(`files: ${files.length}, total: ${(total / 1048576).toFixed(2)}MB`);
if (total > MAX_BYTES) {
  console.error(`STOP: ${(total / 1048576).toFixed(1)}MB exceeds safety ceiling 45MB — not publishing.`);
  process.exit(2);
}
if (dry) process.exit(0);

// Empty repos reject the Git Data API — initialise with one file first.
let parentRef = null;
try {
  parentRef = await gh("GET", `repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
} catch (err) {
  if (!/409|404/.test(String(err))) throw err;
  await gh("PUT", `repos/${OWNER}/${REPO}/contents/README.md`, {
    message: "init",
    content: Buffer.from("init\n").toString("base64"),
    branch: BRANCH,
  });
}

// Old file list (for purging deleted parts after the push).
let oldPaths = [];
try {
  const oldTree = await gh("GET", `repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`);
  oldPaths = oldTree.tree.filter((t) => t.type === "blob").map((t) => t.path);
} catch {}

// Build tree incrementally in ~3MB batches (inline content, no per-file blob calls).
let baseTree;
let batch = [];
let batchBytes = 0;
const flush = async () => {
  if (!batch.length) return;
  const t = await gh("POST", `repos/${OWNER}/${REPO}/git/trees`, {
    ...(baseTree ? { base_tree: baseTree } : {}),
    tree: batch.map((f) => ({ path: f.path, mode: "100644", type: "blob", content: f.content })),
  });
  baseTree = t.sha;
  process.stdout.write(`  tree +${batch.length}\n`);
  batch = [];
  batchBytes = 0;
};
for (const f of files) {
  batch.push(f);
  batchBytes += Buffer.byteLength(f.content);
  if (batchBytes >= BATCH_BYTES) await flush();
}
await flush();

const commit = await gh("POST", `repos/${OWNER}/${REPO}/git/commits`, {
  message: `offline publish ${new Date().toISOString()}`,
  tree: baseTree,
  parents: [], // single squashed commit — history never grows
});
await gh("PATCH", `repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, { sha: commit.sha, force: true });
console.log(`pushed commit ${commit.sha}`);

// Purge manifest + every file that changed or was removed.
const purge = new Set([`${CDN_PATH}/updates/manifest.js`, `${CDN_PATH}/updates/manifest.json`]);
const now = new Set(files.map((f) => f.path));
for (const p of oldPaths) if (!now.has(p)) purge.add(p);
for (const f of files) if (!oldPaths.includes(f.path)) purge.add(f.path);
let ok = 0;
for (const p of purge) {
  const r = await fetch(`https://purge.jsdelivr.net/gh/${OWNER}/${REPO}@${BRANCH}/${p}`).catch(() => null);
  if (r?.ok) ok++;
}
console.log(`purged ${ok}/${purge.size}`);
