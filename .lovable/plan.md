# Investigation: "Internal error opening backing store for indexedDB.open" (launcher rev 14)

This is a findings report only. Nothing was changed. The options at the end need your approval.

## Bottom line
Nothing was published in the last 48 hours. The last release was version 16 on Sep 26 at about 21:23–21:38 UTC. No manifest contains anything new that the launcher reacts to. Our code has no timer or scheduled cleanup that touches the database hours after the app opens. The error comes from Chrome itself, inside `indexedDB.open()`, before any of our logic runs.

## 1. Release timeline (UTC), checked live on Oct 4 at 13:36

| When | What |
| --- | --- |
| Sep 26, 20:14 | Version 15 publish commit (a6f9f63c, main repo) |
| Sep 26, 21:16 | Local revert to c59038a2 |
| Sep 26, 21:23:41 | New repo `achotikala-offline`: commit 8526f1fa, version 16. This is still its latest commit. |
| Sep 26, 21:30:42–21:30:51 | All 4 Drive files last modified (16,214,771 bytes each; checked from the public download headers) |
| Sep 26, 21:38 | Main repo `achotikala`: commit cf023bf1, version 16 in `offline-cdn/` (194 files) |
| Sep 29, 13:03 | Main repo commits: listing drawer fix only. No `offline-cdn` files. |
| Oct 4, 13:28 | Main repo commits: plan file only. No `offline-cdn` files. |

There were also purges of the jsDelivr cache, but only on Sep 26 during the version 16 release. I haven't run any since.

**What is live right now:** version 16 everywhere. That covers jsDelivr for the new repo, jsDelivr for the old repo, and GitHub directly for both. All four point their `origin` field at the new repo.

**Between yesterday evening and this morning (Israel time): nothing was published.** No manifest change, no Drive change, no purge.

I couldn't check Drive version history through the Drive API, because the stored Drive token has expired (401). The public download headers are enough to confirm the Sep 26 date.

## 2. What an installed rev 14 does on its next open
Every open of an up-to-date install:
1. Opens the database (`achotikala-app`, version 1).
2. Reads `updateLog`, `originOverride`, `current`, `previous` and `boot`.
3. Writes `boot` (the attempt counter).
4. Builds the site from stored files.
5. Marks the version as working (`verified`).
6. About 600ms later, fetches the manifest through a script tag.
7. The manifest says version 16 and the device is on 16, so it logs "already-current". Nothing is downloaded, deleted or reloaded.

The heavy sequence never ran in this window, because there was no new version. That sequence is: cleanup, then downloads one file at a time with one transaction per file, then a one-transaction manifest switch, then cleanup again, then a reload 900ms later.

Even when that sequence does run, the reload only happens after every transaction has finished. Deletes are fast but small: about 100 records at most.

The diagnostic log is written after each log line. Writes are serialized, small, and capped at 160 entries.

**Conclusion:** No recent update could have left the database broken. There wasn't one.

## 3. Timed or delayed actions that touch the database
- Inside the launcher: a 600ms delay before the update check, a 15-minute update timeout, short retries when a file fails to download, and the long-press diagnostic timer. None of them runs hours later. There is no cache expiry and no scheduled cleanup.
- Inside the site itself: its own content cache (database `achotikala-offline`) is only written when content is imported or fetched. The offline build has no update sources configured, so in practice it doesn't write.
- The live content cache and the Liba sign-in session use `localStorage`, not IndexedDB. Hourly session refresh writes to `localStorage` only. That's a separate store, but in Chrome it shares the same `file://` profile folder.

**Conclusion:** Nothing in our code goes off "a few hours after it worked".

## 4. Server-side startup dependencies
- The only thing the launcher needs at startup is the manifest. It currently contains `origin` set to the new repo URL, the same value as on Sep 26. Rev 14 already lists the new repo first, so this changes nothing.
- No `redirect` field exists, and `originOverride` is only stored when a manifest's `origin` differs from the source it was loaded from.
- None of this matters for this error anyway: the database open fails before the manifest is fetched. The footer shows `package —` and `server —`, which matches that.

## 5. Chrome versions in the logs
- The edge and request logs I can query returned no rows for the last 72 hours (the data has probably been cleared after its retention period).
- `access_denied_attempts` doesn't store browser information. The only offline-tagged rows are from before Sep 30.
- So I can't compare the browser versions of working devices against failing ones from our data.
- From public sources: Chrome 153 became stable on Sep 8 [6](https://chromereleases.googleblog.com/2026/09/stable-channel-update-for-desktop_0808145027.html), and Chrome 154 on Sep 22. Chrome 154 rolls out "over the coming days/weeks" [5](https://chromereleases.googleblog.com/2026/09/stable-channel-update-for-desktop_0856730748.html). Devices that sat idle over the holiday would install 154 on their first restart after it.
- The 153 and 154 release notes I reviewed mention no change to IndexedDB or `file://` storage [1](https://developer.chrome.com/release-notes/153) [2](https://developer.chrome.com/release-notes/154).
- Other large apps see this exact error widely on Chrome and Edge desktop with no storage-full signal. They describe it as a Chromium-internal storage failure, where `deleteDatabase()` also fails while the corrupt files remain [1](https://github.com/Expensify/App/issues/87862) [2](https://github.com/Expensify/App/issues/90636).

## Ranked hypotheses
1. **A Chrome update applied on restart after the holiday (154.x, or a later minor update), that breaks or locks file:// storage for existing profiles.** This fits "worked yesterday, broke hours later" (Chrome installs updates on its next restart) and "several devices" (each one updates on its own). Not proven: the release notes show nothing, and I have no browser data from our logs.
2. **Security or filtering software on the computer (antivirus, or the NetFree client or its certificate tools) that was updated or tightened and now locks or blocks Chrome's storage folder.** This fits several devices in the same household or community failing at the same time. Not proven.
3. **The devices share one Chrome profile through sync or a redirected profile folder (network drive, OneDrive).** Then a single corruption would show on every device. Worth asking about.
4. **The "several devices" are actually several browsers or windows on the same computer**, or the same profile. Then it's simply local profile corruption. Low likelihood, but it needs to be confirmed with her.
5. **Something we did.** Very low likelihood: there was no publish, the manifest didn't change, there's no timed code, and the error happens before our code runs.

## Questions to ask the affected user (decisive)
- Exact Chrome version on each device (`chrome://version`), and whether it says "Relaunch to update".
- Are the devices separate computers, each with its own Windows user and Chrome? Do they share sync or a network or OneDrive profile folder?
- Which antivirus or filter software is installed, and was any of it updated over the holiday?
- Does the same file open in Edge, or in a new Chrome profile, or in a Chrome Guest window? If yes, the problem is local to her Chrome profile. If no, it points at software on the computer.
- Does any other site work after opening `chrome://settings/content/all`? Does `chrome://indexeddb-internals` show an error?

## Options (from the first report, still valid; need approval)
- Launcher rev 15 for the failure path only, with these steps in order:
  1. Retry the open a few times with a short delay.
  2. Delete and recreate our own database once, guarded so it never loops.
  3. Run from memory using the content embedded in the install file, with a clear banner saying nothing is saved and updates are off.
- No change to the 32KB part size, part format, file-signature handling, update chain or Drive link IDs.
- A release would go through the full chain (build, pack, verify, publish both repos, purge jsDelivr and check manifest and parts, rebuild the install file, update and verify all 4 Drive links).
- Separately: refresh the Drive token, which has expired. Uploading a new install file to Drive needs a working token.

## Note
I couldn't add this to the project's task list. Planning mode only allows editing the plan. I'll add it as soon as work is approved.
