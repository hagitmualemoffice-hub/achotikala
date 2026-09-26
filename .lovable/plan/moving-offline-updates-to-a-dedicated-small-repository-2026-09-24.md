# Moving offline updates to a dedicated small repository

## Findings (measured today)

**1. Size now**
- `offline-cdn/`: 20MB, 517 part files (current version plus the one before it; the pack script already deletes older parts).
- The whole saved history of the `achotikala` repository is about **124MB**, well over jsDelivr's 50MB limit. The biggest items in it:

| Area in history | Size |
|---|---|
| `src/assets` (site images, including old uncompressed versions) | ~45MB |
| `offline-dist/media` (build output committed once in the past, now ignored) | ~26MB |
| `offline-cdn/updates` (update parts) | ~20MB and growing |
| `public/magazines` + `public/downloads` (PDFs) | ~21MB |

So `offline-cdn` is not the only cause. The repository was already over the limit from site images and old build output. Moving `offline-cdn` out removes the offline channel from that problem for good.

**2. History is the real problem.** Deleted part files stay in the saved history and still count toward the size. History in `achotikala` can't be cleaned safely, because Lovable manages it and syncs it both ways. A fresh repository fixes this only with a pruning policy (below). Without one, it would pass 50MB again after about 5 to 10 releases.

**3. Existing installs are locked to the current address.** The update address (`ORIGIN`) is written into the launcher file when the install file is built. The launcher can't change it, and updates only replace app content, never the launcher. That means existing installs **cannot** be moved to a new repository through a normal update. Changing the address with no bridge would repeat the "everyone downloads again" problem.

**4. Other bloat** comes from site images, PDFs and old build output. It is all in history and can't be removed in place. This is one more reason the offline channel should not depend on this repository.

## Recommendation

A dedicated repository, a launcher that can follow a redirect, and a soft transition in which nobody is forced to download again.

## Plan

**Step 1: New repository**
- Create `hagitmualemoffice-hub/achotikala-offline`: public, updates only, never edited by Lovable.
- It is served at `cdn.jsdelivr.net/gh/hagitmualemoffice-hub/achotikala-offline@main/...`.

**Step 2: Keeping the size small permanently (pruning policy)**
- Each release keeps only the current version's parts and the previous version's parts. The previous version stays so that users halfway through an update can finish it. Users who are already up to date need no old parts. Users further behind simply download the new version from scratch; the launcher already handles that.
- Publishing uses a **single squashed commit with force-push** (the branch always holds one commit). History never builds up, so the repository stays around 20 to 40MB.
- If a release gets close to 45MB, it stops and warns before publishing.
- Before the force-push, a purge is sent for any part that is being deleted.

**Step 3: Launcher bootstrap revision 14**
- `ORIGIN` becomes a list: the new repository first, the old one as a backup.
- The launcher also accepts an optional `origin` field in the manifest. It saves it on the device and uses it from then on. This allows future moves with no reinstall.
- The ~32KB chunking, the header scrambling, masking=0 and the file format are all unchanged.

**Step 4: Transition with no forced reinstall**
- Every release is published to **both** places: the new repository (the main channel) and `achotikala/offline-cdn` (for existing installs on revision 13 and below).
- New installs from all 4 Drive links get revision 14, and they already point to the new repository.
- Existing installs keep receiving updates from the old address, on the same best-effort basis as today. When one of them hits jsDelivr's size limit, the in-app update screen suggests downloading again. This is a soft suggestion, not forced.
- After a period (suggested: about 2 months, or once the update log shows few revision-13 users), the old channel is frozen.

**Step 5: Checks for every release** (added to the standing procedure)
- Compare the commit in the new repository through the API.
- Check the manifest and **every** part on jsDelivr at the new address, and at the old one during the transition.
- Update all 4 Drive files and verify each one.
- Record in the project's working notes that the new repository is now the main channel.

## Technical details
- `offline/config.json`: `ghRepo` becomes `achotikala-offline`. Add `legacy: { ghRepo: "achotikala", enabled: true }`.
- New `scripts/publish-offline-repo.mjs`: copies `offline-cdn/` into the new repository as a single commit with force-push, through the GitHub connector from the server side, not from Lovable. It then calls purge for the manifest and for changed parts. This needs a GitHub connection with write access to the new repository; I'll check it exists before starting.
- `scripts/offline-shared.mjs`: `updateOrigin`/`purgeUrl` support primary and legacy addresses. `verify-offline-publish.mjs` checks both.
- `offline/launcher.html`: `BOOT_REV = 14`. `ORIGINS = [primary, legacy]`, trying the manifest from each in turn (15-second timeout each). The saved `origin` override is kept in IndexedDB META. Parts are loaded from whichever address the manifest came from.
- `build-offline-package.mjs`: replaces `__UPDATE_ORIGINS__` with the list.
- Backward compatibility test: a fresh install of revision 14, plus an existing install of revision 13 updating from the old address. Both are done before the release.
- Not changed: `pack-offline.mjs` chunking, the part format, Drive file IDs.

## Needed from you
- Approve the new repository name, `achotikala-offline`.
- Confirm there's a GitHub connection with permission to create and write to it. If not, I'll send the exact link to connect one.
