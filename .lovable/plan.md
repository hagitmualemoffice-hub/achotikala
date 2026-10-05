# Why offline users don't see the latest update

## Findings (checked today, 5 Oct 2026, 14:20 UTC)

1. **Offline channel state**
   - New repo (achotikala-offline): GitHub v17, jsDelivr v17. Released 12:00 UTC today (commit "offline publish 12:01:55").
   - Old repo (achotikala): GitHub v17, but **jsDelivr still serves v16** (stale cache). It was never purged after the v17 sync.
   - Drive: all four files were updated at 12:04 UTC (16.4MB). The Drive connection answers normally (200), so it is not expired right now.
2. **Site vs package**: the published manifest has no source fingerprint field, so the comparison is by commit. Only one code file changed after the v17 package: `ResponsiveDialog` at 12:25 UTC, which is the fix for the daily card opening and closing on phones. The current fingerprint is `34be9e395276`.
3. **What updates on its own**: events, blog posts, songs and podcast arrive through the content sync. Code, pages, layout and popups only arrive with a new offline release. The phone fix is **code**, so it needs a release.
4. **Drive credential**: it works today. The Drive function's own token (`OFFLINE_DRIVE_TOKEN`) still isn't readable, so uploading goes through the Drive connector, as it did for v17. Nothing needs the owner.
5. **Failed or partial release**: none. Both repos have v17 on GitHub. The only gap is the old repo's stale jsDelivr cache.

## Most likely reason
There are two causes, depending on the member:
- Members on new installs (rev 14+) have v17. They don't have the phone fix because it was made after v17 was packaged.
- Members on old installs (rev 13) read the old repo through jsDelivr, which still shows v16. They haven't received v17 at all.

## Fix steps (after approval)
1. Purge jsDelivr for the old repo's manifest and check that it shows v17.
2. Publish v18 with the full release chain: build, pack, local verify, runtime check, push, purge and verify jsDelivr for both repos, rebuild the install file, update all four Drive files, then download and verify each link.
3. Add `sourceFingerprint` to the manifest when packing, so the admin "up to date" check works.
