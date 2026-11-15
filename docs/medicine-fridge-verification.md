# Medicine fridge — step 1 verification

Date: 2026-11-15. Frontend remains unpublished. Only medicine-specific schema/function additions were applied to the shared backend. Existing account, membership, access, storage and offline mechanisms were not altered.

## Real anonymous API results

Tests used an empty browser context and the application's public key, not an admin token. Private test data existed during these checks and was readable through the authenticated admin screen.

| Request | Result |
| --- | --- |
| `GET /rest/v1/medicine_contacts?select=*` | HTTP 200, `[]` |
| `GET /rest/v1/medicine_requests?select=*` | HTTP 200, `[]` |
| `GET /rest/v1/medicine_abuse_events?select=*` | HTTP 200, `[]` |
| `POST /rest/v1/medicine_listings` | HTTP 401, SQLSTATE 42501, row-level security violation |
| `POST /rest/v1/medicine_requests` | HTTP 401, SQLSTATE 42501, row-level security violation |
| `POST /rest/v1/rpc/medicine_submit` | HTTP 401, SQLSTATE 42501, permission denied |

Public listing rows have no account ID, contact number/name/email, exact-address field, token or token hash. Contacts and requests have admin-only RLS. Atomic creation and token management RPCs are service-only. An anonymous visitor cannot write directly, including by bypassing the edge function.

## Browser flows

- Anonymous upload using a matched catalog name: HTTP 200, visible public row and private management link.
- All eight requested fuzzy inputs resolve to the expected catalog name.
- Anonymous request: HTTP 200, success state; requester and giver contacts read back through authenticated admin queue.
- Admin reservation updates public chip and disables request button; admin release restores availability.
- TEST catalog alias editing and approval persist after reload; no real draft entry was approved.
- Admin removal and marking a request handled persist.
- Private management token marks delivered; listing disappears from public view.
- Mobile 390 and 360 pixels: row layout and no horizontal overflow. At 390, upload action remained at y=780 before and after body scrolling.
- No page errors in the completed main flow. Desktop navigation adjusted to keep the new link within the existing header.

## Abuse and validation

- Immediate submit rejected; server-signed challenge requires at least 3 seconds and expires after 2 hours.
- Honeypot, past expiry, public contact numbers/addresses, and text links rejected.
- Keyed IP and phone digests only in abuse storage; no raw IP column or logging in the new function.
- Creation limits tested: 5 per phone/hour and 10 per IP/hour; next submission rejected.
- Request phone limit tested: 10/hour; next request rejected. IP request limit is configured as 20/hour in the atomic function.
- 18 Vitest client tests and 10 Deno server tests passed.
- Preview harness latest build: `build OK`.

## Cleanup

Removed all ten explicitly identified TEST listings (cascade removed their contacts and requests), the TEST_CATALOG entry, and all 23 identified test abuse events. Read-back counts:

```text
listings: 0
contacts: 0
requests: 0
abuse_events: 0
test_catalog: 0
draft_catalog: 17
```

The empty real public page was checked after cleanup. No test entries remain.

## Scope verification and remaining review

`git diff --name-only -- offline/ scripts/ offline-cdn/` returned no entries. No offline build, package, release, Drive replacement, manifest change or publish was run.

Review the safety wording and opened-medication policy, regional mapping and thresholds before public release. Expiry means the last day of the selected month; a close-expiry flag uses 60 days. The catalog has no medical claims. Generic names are search aliases only. Gonal-F and Pergoveris use the injection/pen admin category.

Route-specific noindex/nofollow uses client-rendered head tags; this is not access control or a server-rendered robots directive. Real NetFree connectivity and opening an installed WhatsApp app were not verified. The requested wa.me links are present; no message was sent. Requests are stored in the existing authenticated admin portal, without email alerts (outside step 1).