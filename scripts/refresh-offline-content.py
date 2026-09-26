#!/usr/bin/env python3
"""Refreshes the content snapshot baked into the Offline build.

Runs before every `bun run build:offline`:
  1. downloads the live content (events / posts / podcast) from the offline-content endpoint
  2. re-encodes every referenced image to a small WebP (<=1600px, q86, aims <300KB)
     and writes it to public/media/offline/ so it ships inside the package
  3. rewrites src/offline/media-manifest.json (url -> local file) and
     src/offline/bundledContent.json (content without inline media).
Fails loudly so a stale snapshot is never shipped silently.
"""
import base64, hashlib, io, json, os, sys, urllib.request
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "https://fwwgvmkksdcrysddyiur.supabase.co/functions/v1/offline-content"
OUT_DIR = os.path.join(ROOT, "public", "media", "offline")
MANIFEST = os.path.join(ROOT, "src", "offline", "media-manifest.json")
BUNDLED = os.path.join(ROOT, "src", "offline", "bundledContent.json")
MAX_DIM, TARGET = 1600, 300 * 1024

with urllib.request.urlopen(URL, timeout=120) as r:
    content = json.load(r)
for key in ("events", "posts", "podcast", "media"):
    if key not in content:
        sys.exit(f"refresh-offline-content: missing '{key}' in response")

os.makedirs(OUT_DIR, exist_ok=True)
for f in os.listdir(OUT_DIR):
    os.remove(os.path.join(OUT_DIR, f))

manifest = {}
for url, data in content["media"].items():
    if not isinstance(data, str) or not data.startswith("data:"):
        continue
    raw = base64.b64decode(data.split(",", 1)[1])
    name = hashlib.sha256(url.split("?")[0].encode()).hexdigest()[:16] + ".webp"
    img = Image.open(io.BytesIO(raw))
    img = img.convert("RGBA" if img.mode in ("RGBA", "LA", "P") else "RGB")
    img.thumbnail((MAX_DIM, MAX_DIM))
    for q in (86, 80, 72, 64):
        buf = io.BytesIO()
        img.save(buf, "WEBP", quality=q, method=6)
        if buf.tell() <= TARGET:
            break
    if buf.tell() > 500 * 1024:
        sys.exit(f"refresh-offline-content: image still over 500KB: {url[:80]}")
    open(os.path.join(OUT_DIR, name), "wb").write(buf.getvalue())
    manifest[url] = f"offline/{name}"

content["media"] = {}
json.dump(manifest, open(MANIFEST, "w"), ensure_ascii=False, indent=1)
json.dump(content, open(BUNDLED, "w"), ensure_ascii=False)
print(f"offline content refreshed: {len(content['events'])} events, {len(content['posts'])} posts, "
      f"{len(manifest)} images, generated {content.get('generatedAt')}")
