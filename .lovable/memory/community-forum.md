---
name: Community forum (הקהילה)
description: One shared closed forum for the regular site and the Offline build — same auth, backend, DB; tables forum_members/forum_posts/forum_comments; route /kehila
type: feature
---
One forum only — never a separate system for the Offline build. Both entry points (achotikala.com and the file:// offline folder) use the same Supabase auth + REST on `fwwgvmkksdcrysddyiur.supabase.co`.

- Route: `/kehila` (HashRouter-compatible), page `src/pages/Community.tsx`, session hook `src/community/useCommunitySession.ts`.
- Access: only signed-in users with `forum_members.status = 'approved'` (server-side RLS via `is_forum_member`). Anonymous users get nothing from the API.
- Forum content is never included in `achotikala-content.json` nor in the offline app bundle.
- Admin base: create community accounts + approve/block in `/admin/users` (edge function `admin-create-user` supports `forumMember` + `displayName`).
- POC test users: test1@achotikala.org / test2@achotikala.org (approved members).
- Future community features (personal area, listings, rides, groups) must follow the same one-service pattern.
- Remember each member's last selected Liba feed layout (`feed` or `compact`) on her device and reopen in that layout.
- Opening a Liba post adds an in-page browser history entry so the phone Back button returns to the Liba list instead of leaving Liba.
