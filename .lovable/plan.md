# Investigation: "Internal error opening backing store for indexedDB.open" (launcher rev 14)

This is a findings report only. Nothing has been changed. The options at the end need your approval before any work starts.

## 1. Rev 13 vs rev 14: what changed in how the database opens
I compared the rev 13 launcher (commit 3aaf347b) with rev 14 (54c80b4a). Only 47 lines were added and 3 removed in total, and none of them touch how the database is opened.
- Database name: still `achotikala-app`. Version: still `1`. Same upgrade logic, same 2 stores (`blobs` and `meta`), and it is still opened once, at one point in startup.
- Timing is also unchanged. The install file still waits for the embedded content to finish loading (`AK_SEED_PENDING` then `seedDone`) before calling `bootMain` and then `openDb`.
- Rev 14's only storage-related additions are an extra read and an occasional write of a small `originOverride` value in `meta`. Both happen after the database is already open, so they can't cause an error at open time.

**Conclusion:** The error happens inside `indexedDB.open()`, before any of rev 14's new code runs. Nothing in the rev 13 to 14 change triggers it.

## 2. Existing rev 13 database vs fresh install
- Same name and same version, so opening an existing rev 13 database runs no upgrade and no schema change. There's no version bump that could fail.
- "Internal error opening backing store" comes from Chrome when it can't open the storage folder on disk for the whole `file://` origin. Our code isn't involved yet. Every file opened from disk shares that one origin, so other offline pages share this storage too, including the app's own `achotikala-offline` cache.
- Possible pattern: these may be users with older installs and a lot of stored data. That's a correlation, not a version-logic cause, and it isn't confirmed yet. Asking users for their diagnostic log (`?diag=1`) would tell us whether they are upgrades or fresh installs. But the log itself is saved in the database, so it may not open either.

## 3. What happens now when opening fails
`bootMain` catches the error, writes "BOOT-FAILED" to the log (in memory only), and shows the error screen. Nothing else runs. That's why the footer shows `package —` and `server —`.

**Fallback: run from memory.** This is feasible in the self-contained install file, because all parts are already in `seedStore`.
- Work: moderate. Add an in-memory store with the same operations (`get`, `put`, `del`, `keys`, `tx`, `switchManifest`). Then run `firstRun` and `start` against it, skipping persistence, update checks and rollback.
- Risk: low to medium.
  - No effect on chunk format, file signatures, the 32KB part size, or how updates work for healthy users. The new path only runs when opening fails.
  - Memory use: about 15MB of decoded content held in memory. That's acceptable on a computer.
  - Limits: nothing is saved between openings, there are no updates in this mode, and Liba sign-in sessions may also be lost. The banner should say this clearly.
  - Only the install file has content inside it. An already-installed user who opens an older or smaller copy of the file has no content in memory to fall back on.

## 4. Could our code cause the corruption?
- Writes are spread out: one transaction per file (`put(db, BLOBS, hash, buf)`), one file at a time. There is no single 15MB transaction, and transactions don't stay open (`oncomplete`, `onerror` and `onabort` are all handled).
- The largest single record is one file, mostly well under 500KB. The total is about 15MB across 114 files.
- Old content is cleaned up (keep current and previous versions, delete the rest), so storage doesn't grow without limit.
- We never call `db.close()`. That's normal and harmless.
- **Conclusion:** I found nothing in our code that plausibly corrupts Chrome's storage. The likely causes are on the user's side: antivirus locking the profile folder, a full disk, a profile corrupted by a crash or forced shutdown, or a synced or redirected profile folder. The fact that several users report it at once points to something shared, such as an antivirus or filter-software update. That isn't proven.

## 5. Self-heal option
A safe sequence, only for errors matching `UnknownError` / "backing store":
1. Try opening again once after about 500ms. Lock contention is often temporary.
2. If it fails again, call `indexedDB.deleteDatabase("achotikala-app")` once (guarded with a `sessionStorage` flag so it never loops), then open again and reinstall from the embedded content.
3. If it still fails, use the in-memory fallback from item 3, with a clear message: "האתר פועל זמנית בלי שמירה. מומלץ להפעיל מחדש את המחשב/את Chrome."

Caveats:
- With real disk-level corruption, `deleteDatabase` usually fails the same way. Step 2 will often not help, so step 3 is the real safety net.
- Deleting the database wipes stored content and the diagnostic log. For users of the install file, the content comes straight back from the file. Users without an embedded file would need the network, and NetFree users may not have it.
- Nothing changes in the update chain, the Drive links, or the GitHub/jsDelivr publishing.

## Recommended next steps (pending approval)
1. Ask 1–2 affected users for: Chrome version, antivirus, free disk space, and whether `chrome://settings/siteData` opens. Also ask whether a different Chrome profile, or Edge, opens the file. That would confirm the cause is in their browser profile.
2. If approved: launcher rev 15 with retry, then a one-time delete-and-recreate, then the in-memory fallback, plus a log entry for each step. After that, the full offline release chain (build, pack, verify, publish both repos, purge jsDelivr and check manifest and parts, rebuild the install file, update and verify all 4 Drive links).
