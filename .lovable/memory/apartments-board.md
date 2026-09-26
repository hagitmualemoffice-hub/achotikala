---
name: לוח דירות (Apartments board)
description: One shared apartments board for the regular site and Offline build; tables apartment_listings/apartment_comments; routes /apartments and /luach-dirot; approved forum members only
type: feature
---
One board only — same backend/auth/data for achotikala.com and the file:// offline build.

- Routes: `/apartments` (also `/luach-dirot`), page `src/pages/Apartments.tsx`, reuses `src/community/useCommunitySession.ts`.
- Access: signed-in users with `forum_members.status = 'approved'` (RLS via `is_forum_member`).
- Listing types: `looking_apartment` / `looking_roommate` / `room_available`.
- Server-enforced: only the author can edit; author or admin can delete a listing; author or admin can delete a comment.
- Board content is never included in `achotikala-content.json` or the offline bundle.
- No images/search/notifications/favorites in this POC — deliberately minimal.
