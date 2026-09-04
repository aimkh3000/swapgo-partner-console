# SwapGo.me Partner API

This guide describes the public server-to-server API used by the SwapGo.me Partner Console and partner systems.

- Public base URL: `https://swapgo.me/api/partner`
- Authentication: `Authorization: Bearer <partner-api-key>`
- Data format: JSON, except documented multipart file uploads
- Organization isolation: the organization is derived from the key and cannot be selected by a request parameter

Partner API keys are server credentials. Never place one in browser JavaScript, a URL, a mobile application, analytics, or a public repository.

## 1. Quick start

1. An organization owner creates the organization's Partner API integration in SwapGo.me.
2. Store the issued key in the partner backend or a secret manager.
3. Validate the key with `GET /api/partner/me`.
4. Select canonical locations and currencies through the reference-search endpoints.
5. Use resource-specific endpoints for points, rates, assignments, reviews, profile data, legal data, tickets, and notifications.

```bash
curl 'https://swapgo.me/api/partner/me' \
  -H 'Authorization: Bearer sgp_live_a1b2c3d4e5f6.EXAMPLE_SECRET_REPLACE_ME_0123456789' \
  -H 'Accept: application/json'
```

The example key is syntactically valid but intentionally non-functional. DEV keys start with `sgp_test_`; PROD keys start with `sgp_live_`.

## 2. Keys, authorization, and quotas

Each key belongs to one integration and one organization. Every key receives the complete Partner API package; there is no per-key scope selector in the organization interface.

- Send the key only in the `Authorization` header.
- An organization can have one current integration and no more than two simultaneously active, unexpired keys.
- Rotation creates a second key without revoking the first. Switch the partner backend, verify the new key, and then revoke the old key.
- Disabling the integration immediately rejects new requests from all its keys without revoking them.
- Retiring an integration is irreversible and revokes all keys.
- Search, ordinary reads, writes, batches, uploads, invalid credentials, organizations, API keys, and source IPs have separate traffic controls.
- Follow `Retry-After` on HTTP 429. If the authenticated limiter is unavailable, requests fail closed with HTTP 503.
- Ordinary JSON requests are limited at the public edge to 256 KiB. Logo and legal-document uploads use separate file limits.

The integration and key lifecycle is managed only inside the SwapGo.me organization workspace. It is not exposed to Partner API.

## 3. Canonical locations and currencies

SwapGo.me does not export its complete reference database. Search for a value and store the selected canonical result.

```text
GET /api/partner/references/locations/search?q=Dubai&locale=en
GET /api/partner/references/locations/resolve?geo=dubai-are&locale=en
GET /api/partner/references/currencies/search?q=USD&locale=en
```

Location search returns up to 10 countries or cities. City results include a canonical slug, ISO3, Wikidata identifiers, English or requested-locale names, country data, and center coordinates. Country results use ISO3 and do not include a city center. Currency search returns up to 20 canonical currency records with code, type, name, symbol, and emoji.

Empty queries, wildcards, and list-all requests are rejected. Mutations revalidate submitted references against the SwapGo.me database.

## 4. Maps in partner interfaces

Partner API supplies canonical city references and stored point coordinates. It does not provide map tiles, styles, layers, zoom rules, or an iframe picker.

The partner frontend may use MapLibre GL JS with MapTiler or another compatible provider. A browser map key is separate from the Partner API key. Creating a point requires canonical city and country references; exact latitude and longitude are optional. When coordinates are supplied, SwapGo.me performs a plausibility check against the canonical city center.

The [SwapGo.me Partner Console](https://github.com/aimkh3000/swapgo-partner-console) includes a working MapLibre picker and a shared MapTiler browser key. Replacing the shared key is recommended because its limits are shared by every installation.

## 5. API resources

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/partner/me` | Validate the key and read integration identity. |
| `GET`, `PATCH` | `/api/partner/organization` | Read or update allowed organization fields. |
| `GET`, `PATCH` | `/api/partner/organization/profile` | Read or update public profile, contacts, schedule, and note. |
| `POST` | `/api/partner/organization/profile/logo` | Upload a logo file. External URLs are forbidden. |
| `GET`, `PATCH` | `/api/partner/organization/legal` | Read or edit the active legal draft. |
| `POST` | `/api/partner/organization/legal/submit` | Submit the active draft for administrator review. |
| `POST` | `/api/partner/organization/legal/cancel` | Cancel the active legal draft. |
| `POST` | `/api/partner/organization/legal/documents` | Upload a document to the active draft. |
| `GET` | `/api/partner/organization/legal/documents/{document_id}/content` | Download an owned document. |
| `PATCH` | `/api/partner/organization/legal/documents/{document_id}` | Change document visibility. |
| `PATCH` | `/api/partner/organization/legal/documents/{document_id}/retirement` | Change an approved document's retirement state. |
| `DELETE` | `/api/partner/organization/legal/documents/{document_id}` | Delete a document from the active draft. |
| `GET`, `POST` | `/api/partner/points` | List or create exchange points. |
| `GET`, `PATCH` | `/api/partner/points/{point_id}` | Read or update one owned point. |
| `PATCH` | `/api/partner/points/{point_id}/status` | Activate, disable, or soft-delete a point. |
| `GET`, `POST` | `/api/partner/directions` | List or create currency-pair identities. |
| `GET`, `PATCH` | `/api/partner/directions/{direction_id}` | Read or update a pair identity. |
| `PATCH` | `/api/partner/directions/{direction_id}/rates` | Update buying rate, selling rate, or comment. |
| `PATCH` | `/api/partner/directions/rates/batch` | Atomically update a bounded rate batch. |
| `PATCH` | `/api/partner/directions/{direction_id}/status` | Activate, pause, or soft-delete a direction. |
| `GET`, `PATCH` | `/api/partner/point-direction-assignments` | Read or update direction availability at points. |
| `GET` | `/api/partner/reviews` | List reviews with filters and summary. |
| `GET` | `/api/partner/reviews/{review_id}` | Read one organization review. |
| `PATCH` | `/api/partner/reviews/{review_id}/reply` | Create, update, or remove the public organization reply. |
| `GET`, `POST` | `/api/partner/support/tickets` | List or create organization tickets. |
| `GET` | `/api/partner/support/tickets/{ticket_id}` | Read a ticket and a page of messages. |
| `POST` | `/api/partner/support/tickets/{ticket_id}/messages` | Add a message to an open ticket. |
| `POST` | `/api/partner/support/tickets/{ticket_id}/close` | Close a ticket. |
| `GET` | `/api/partner/notifications` | Read administrative notifications. |
| `GET` | `/api/partner/notifications/{notification_id}` | Read one owned notification. |

Team management, invitations, internal audit, passwords, TOTP, sessions, and API-key lifecycle controls are deliberately excluded.

## 6. Organization profile, legal data, and documents

Organization identity, public profile, and legal draft are separate versioned resources. PATCH changes only explicitly submitted fields.

- Profile updates cover description, website, public contacts, working hours, and note.
- Logos are uploaded as JPEG, PNG, or WebP multipart files, normally up to 2 MiB.
- Legal-document uploads accept PDF, JPEG, PNG, or WebP. The hard ceiling is 10 MiB and a deployment may configure a lower limit.
- New documents use `company_registration`, `license`, or `other` and visibility `private` or `public_after_approval`.
- External logo and document URLs are not accepted.
- Submitting a legal draft only places it in the SwapGo.me administrative review queue. Partner API cannot approve or apply legal changes.

Read the latest resource first and use its ETag in `If-Match` for every versioned mutation.

## 7. Exchange points

The SwapGo.me backend always filters and paginates the list. Do not load the entire organization and imitate filtering in the browser.

```text
GET /api/partner/points?status_filter=active&city_slug=dubai-are&from_code=usd_cash&to_code=aed_cash&limit=50&offset=0
```

- `limit` defaults to 50 and cannot exceed 100.
- `offset` is the number of matching rows to skip and cannot exceed 1,000.
- Use `city_slug` for one city or `country_iso3` for one country. If both are sent, the city takes precedence.
- Currency filters return only points where the matching active organization direction is enabled, including effective inherited assignments.
- A viewport requires all four values: `west`, `south`, `east`, and `north`. Partial bounds are rejected; anti-meridian bounds are supported.
- Deleted points are excluded unless a synchronization request explicitly uses `status_filter=all&include_deleted=true`.
- Omitting `direction_ids` on create enables inheritance of active organization directions. An explicit list selects those assignments; an empty list enables none.

## 8. Directions, rates, and assignments

A direction defines currency-pair identity and status. Its default buying rate, selling rate, and comment are a separate resource. Assignments determine whether the direction appears at a point; there is no separate point-level rate.

Send monetary values as decimal strings, for example `"3.67250000"`. Values must be positive, have no more than 8 decimal places, and have an absolute value below 10,000,000,000.

`GET /api/partner/rates` may include paused or incomplete directions. Consumers must check both status and rate availability. A batch is atomic: if one expected version is stale, the complete batch rolls back.

Assignment writes use `enable`, `disable`, or `replace` and exactly one scope: point IDs, one city slug, or one country ISO3. Read the selected scope first and send its strong assignment ETag in `If-Match`.

## 9. Tickets and notifications

Tickets are two-way conversations shared with the organization support queue. Notifications are immutable one-way administrative messages.

- Ticket lists support `status=all|open|closed`, `limit`, and `offset`.
- Ticket detail uses separate `message_limit` and `message_offset` values.
- A closed ticket remains readable but rejects new messages.
- Notifications are ordered newest first and use `limit/offset`.
- API reads do not change an individual owner's personal read state in the web workspace.
- Ticket creation and messages have additional anti-spam intervals and daily ceilings.

Every support POST requires a unique `Idempotency-Key`. Reuse the original key only when retrying the same action.

## 10. Mutations and rate pushes

There is no universal JSON synchronization endpoint. Use the strict resource endpoint for each operation.

- Every `POST`, `PATCH`, and `DELETE` requires an ASCII `Idempotency-Key` of 1–200 visible characters.
- Replaying an identical completed request within the retention window returns the stored response with `Idempotency-Replayed: true`.
- Reusing a key for a different method, route, or body is rejected.
- Versioned mutations also require `If-Match` from the latest GET response.
- Missing `If-Match` returns 428. A stale version returns 409 without overwriting concurrent work.
- Push rates only when values change. Prefer a bounded batch with a short debounce over one request per direction.
- Assignment `replace` intentionally replaces the full selected scope. Prefer `enable` and `disable` for ordinary synchronization.

## 11. Filters and pagination

Collection endpoints use `limit` and `offset`.

1. Start at `offset=0`.
2. Calculate the next offset as `offset + items.length`.
3. Stop when the next offset reaches `total_count` or the response has fewer items than requested.

The maximum page size is 100 and the hard offset ceiling is 1,000. The ceiling is a safety guard, not a recommended synchronization target. Keep endpoint, filters, and ordering stable while traversing pages. Offset pages are not snapshots, so de-duplicate by resource ID and compare `updated_at` values and ETags during recurring synchronization.

## 12. Reliability and retries

| Status | Client action |
| --- | --- |
| `2xx` | Store the response and request ID. |
| `409` | Inspect `error.code`, fetch fresh state when stale, reconcile, and use a new idempotency key for a changed request. |
| `428` | Obtain the current ETag and send `If-Match`. |
| `400`, `401`, `403`, `404`, `422` | Correct credentials, permissions, route, or payload; do not retry automatically. |
| `413` | Reduce JSON size or upload a file within its documented limit. |
| `429` | Wait for `Retry-After`; reuse the original idempotency key for the same mutation. |
| `5xx` or timeout | Use bounded exponential backoff with jitter and reuse the original idempotency key for the same mutation. |

Never retry indefinitely. Retain failed work on the partner side and show the latest request ID to an operator.

## 13. Security requirements

- Use server-to-server HTTPS only.
- Store Partner API keys in a secret manager and separate DEV from PROD.
- Never disable TLS verification.
- Never log `Authorization`, full contact payloads, or document contents.
- Keep Partner API behind a backend-for-frontend when building a browser interface.
- Use a separate browser key for MapTiler or another map provider.
- Rotate immediately if a Partner API key leaks, switch traffic, and revoke the old key.
- Preserve `request_id` for support without exposing the credential or full payload.

SwapGo.me independently enforces organization ownership, permissions, rate limits, idempotency, optimistic concurrency, file validation, and internal audit records.

## 14. Error format

Application errors use a stable envelope:

```json
{
  "error": {
    "code": "partner_scope_required",
    "message": "The operation is not allowed.",
    "field": null,
    "details": { "scope": "points:write" },
    "request_id": "req_01..."
  }
}
```

Handle the HTTP status even if an edge rejection returns a shorter body. `code` is intended for programmatic handling, `field` identifies an invalid value when available, and `request_id` lets SwapGo.me support locate the request without receiving the secret.
