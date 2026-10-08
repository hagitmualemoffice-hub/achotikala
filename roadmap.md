# Roadmap

- [x] Mobile directories: floating add, one-row search/filter icon/view; fixed drawer actions; balanced forum spacing and flush sticky header. Authenticated mobile screens and add/filter drawers checked; action bounds stayed unchanged after scrolling in Baar, Places, Inquiries and Apartments; five identity tests passed and preview build OK.
- [ ] Release mobile fixes as offline v20. Build, pack, local verification (436 unique parts, zero problems) and network-blocked fresh install passed; dedicated repository publish completed (0e35bf12135a33f98d0e86f82809ec428c8722a7). STOPPED: primary jsDelivr full verifier exceeded command time limit without a result. Both-channel CDN/hash checks, Drive uploads/download checks and rev13/rev14 upgrades remain unverified; Drive files were not changed.

- [x] Release offline v19: build/pack/local and network-blocked fresh-install checks passed; both GitHub/jsDelivr channels serve matching v19 manifests and 436 unique parts with zero problems; all four fixed Drive installers uploaded and publicly downloaded (16,392,936 bytes each, MD5 b237668bd45f9df8dabe7596674ba2f3, embedded v19); actual rev13 legacy/rev14 primary launchers upgraded seeded v18 to v19, retained v18 backup and passed health checks without runtime errors. Manifest, packaging, chunking and launcher unchanged.

- [x] Match directory plus to primary pink, move apartment personal ads into filters, remove Baar Daily Baar controls, and align expanding searches immediately after add. Verified all four authenticated screens and personal ads dialog; build OK. Offline release not requested.

- [x] Make inquiries five cards per desktop row and reserve helper/avatar/cancellation space; verified five populated cards per row, aligned help/update buttons and no button movement when reserved slots fill. Help dialog opens; no help submitted. Offline release not requested.

- [x] Unify directory headings/info, circular red add controls, dropdown filters and card/list selectors across Baar, Places, Inquiries and Apartments; verified authenticated info/add dialogs, filters, populated apartment rows and mobile layout. Offline release not requested.

- [x] Remove inquiry side columns and forum category strip; compact view switch; fix forum navigation from inquiries and mobile forum label.

- [x] Implement reversible Liba full-name posting experiment with backend enforcement, independent announcement control and per-member response summary.
- [x] Verify nickname history preservation, authenticated posts/comments/replies, direct nickname rejection, automatic announcement and per-member dismissal/response counts; clean up test content and restore inactive settings. Offline UI has not been released; stale clients are covered by server enforcement.

- [x] Unify Liba popups as Wolt-style mobile drawers with stable top/content/bottom regions and preserve every popup's text.
- [x] Add custom floral illustration accents to the Daily Baar entry, sidebar card, and completion/share state only.
- [x] Prioritize relevant open inquiries on the Daily Baar completion screen and reuse the existing filtered inquiries flow.
- [x] Keep every Liba popup action area fixed with balanced bottom spacing, and limit Daily Baar preferences to one filter type.
- [x] Emphasize the Daily Baar boy card, place four actions in one bottom row, and add a shared proposal contact to every boy card.
- [x] Allow a Daily Baar member adding boy details to recommend him in the same form.

- [x] Refine Daily Baar: pink hearts, replayable card and thinking option, dedicated settings, age range, and every-other-day default popup.

- [x] Move all emoji choices into the reactions panel.
- [x] Keep mobile feed titles on one line.
- [x] Build the two-line mobile compact layout.
- [x] Persist the selected feed layout.
- [x] Keep phone back navigation inside Liba when closing a post.
- [x] Standardize reactions on posts, comments, and nested replies with removable selections.
- [x] Re-encode the 29 referenced oversized images according to the approved plan.
- [x] Update local imports, hosted asset pointers, database cover references, and offline media mappings.
- [x] Verify desktop/mobile visuals, final payload reduction, and a clean build without publishing.
- [x] Build the dedicated בירורים space inside ליבה from the approved brief and visual reference.
- [x] Add numbered pagination, stronger names, photo status, and colorful chips to the באר list.
- [x] Add unified mobile bottom navigation across all Liba screens.
- [x] Add fixed mobile create buttons for forum, Baar, Places, and inquiries.
- [x] Simplify mobile search/view/filter controls and hide authorized intro copy.
- [x] Align forum comment counts left on mobile.
- [x] Verify all Liba mobile screens and clean build.
- [x] Make the mobile inbox and conversation layout feel closer to WhatsApp.
- [x] Restrict post and comment action menus to each woman’s own content on mobile.
- [x] Show post creation time, using short Hebrew time labels without the word "לפני".
- [x] Remove decorative space icons wherever the space name is already written.
- [x] Add gentle WhatsApp-like transitions between the feed, posts, and mobile drawers.
- [x] Finish mobile reply fields with auto-growth and compact arrow send buttons.
- [x] Build a complete post footer with reactions, comment count, avatars, and a reply action.
- [x] Move the live quick-look section below the mobile feed and link the top-bar shortcut to it.
- [x] Stack two upcoming events and show two narrow inquiry cards with a link for more.
- [x] Keep the post composer’s space selector inline and make drawer action bars sticky.
- [x] Expand and reorganize the reactions panel into a wider multi-row picker.
- [x] Allow a sender to delete her own private chat message securely.
- [x] Make Enter add a new line in private chat; send only from the send button.
- [x] Show notifications in a mobile drawer containing notifications only.
- [x] Open messages without personal-area tabs; keep saved items in the personal area.
- [x] Put chat immediately after the forum in mobile navigation, remove personal area there, and replace top chat with My Heart.
- [x] Differentiate members with identical first names using stable colors and two initials when available.
- [x] Keep the inquiry help button outlined until help was offered, then show it filled, on mobile and desktop.
- [x] Make quick-look counters open their content and clear after viewing.
- [x] Carry shared mobile behavior fixes into desktop views where applicable.
- [x] Maintain four fixed public Google Drive install files and update all four together on every publish.
- [x] Restore desktop chat links in the top bar and sidebar before community tools.
- [x] Show persistent side alerts for unread private messages, including after returning to the site.
- [x] Send private chat with Enter on desktop while keeping button-only sending on mobile.
- [x] Compact the desktop chat layout and remove the pink outline from sent bubbles.
- [x] Centralize and persist Liba authentication/access until explicit sign-out.
- [x] Keep approved screens available during temporary network loss across mobile and desktop.
- [x] Verify navigation, offline behavior, and explicit sign-out cache clearing.
- [x] Allow email-code sign-in for manually approved Liba access requests.
- [x] Make the offline build command reliable and complete a clean local package verification.
- [x] Show desktop system notifications for new Liba chat messages while the site is in the background.
- [x] Remove the unused white strip below mobile chat and let the conversation use all space above navigation.
- [x] Make tapping Chat in the mobile navigation always return to the full conversations list.
- [x] Keep the mobile post publish action visible in a WhatsApp-style sticky bottom bar.
- [x] Keep Hey Liba only on the main community space.
- [x] Preserve a separate unsent chat draft for every conversation.
- [x] Standardize gentle popup motion and left-side close controls across mobile and desktop.
- [x] Pin the mobile chat composer directly above navigation without page-scroll movement.
- [x] Remove the post composer back action and keep its strong pink publish action at the bottom.
- [x] Match the Baar add form to the unified composer drawer with a sticky pink action and no bottom cancel.
- [x] Match the Places add form to the unified composer drawer with a sticky pink action and no bottom cancel.
- [x] Match the Apartments add form to the unified composer drawer with a sticky pink action and no bottom cancel.
- [x] Keep the Baar and Places mobile drawers open and fully interactive while typing.
- [x] Make the offline Liba access-request form open reliably.
- [x] Convert the existing Liba quiz into an inactive reusable managed template with scheduling controls.
- [x] Add reusable managed announcement/event content with cover, title, body, scheduling, manual removal, and community comments.
- [x] Show active announcements as temporary top feed tabs and create the Sukkot save-the-date for one day after the correct cover is supplied.
- [x] Verify admin management, automatic expiry, member reading/comments, and mobile/desktop presentation; keep the offline release unpublished.
- [x] Offline: events, blog and songs load live with last-known cache + baked fallback (unreleased).
- [x] Release offline v13 — superseded by verified v18 release.
- [x] Move offline updates to a dedicated repository — completed before v18.
- [ ] Investigate "email not found" for NetFree users with evidence.
- [x] Baar "ההשתדלות היומית" — card including recommendations, settings and sidebar access built.
- [x] Offline v18 released: both channels, 4 Drive links, rev13/rev14 upgrades verified.
