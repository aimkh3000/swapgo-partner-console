# SwapGo.me Partner Console

A small, English-only reference product for testing and integrating the [SwapGo.me Partner API](https://swapgo.me/org/partner). Partners can run it as a ready-made console, use it as an integration test client, or copy the relevant flows into their own product.

Read the public [Partner API integration guide](docs/PARTNER_API.md) for endpoints, canonical references, pagination, mutation contracts, retry rules, and security requirements.

The console is intentionally independent from SwapGo.me. It has no direct database access and does not import internal organization services. Its Next.js server communicates with Partner API; the browser communicates only with a strict same-origin backend-for-frontend (BFF).

## Included workflows

- create, edit, pause, and delete exchange directions and rates;
- create and edit exchange points, select their coordinates, and assign existing directions;
- search canonical SwapGo.me locations and currencies without downloading reference databases;
- filter points and reviews by canonical city or country;
- read reviews and create, update, or remove an organization reply;
- edit the public organization profile, contacts, and working hours;
- manage a legal draft and its uploaded documents, then submit it for SwapGo.me administrator review;
- create and continue support tickets and read administrative notifications;
- render point maps with MapLibre GL JS and the included shared MapTiler browser key, or a partner-owned replacement.

Team management, invitations, internal audit, organization login settings, and Partner API key lifecycle controls are deliberately excluded. Those remain inside the SwapGo.me organization workspace.

## Requirements

- Node.js 20 or newer;
- an active SwapGo.me organization and Partner API key;
- an optional partner-owned MapTiler browser key when the included shared key should be replaced.

## Local start

```bash
git clone https://github.com/aimkh3000/swapgo-partner-console.git
cd swapgo-partner-console
cp .env.example .env.local
```

Set a random session secret in `.env.local`:

```bash
openssl rand -base64 48
```

Paste the generated value into `PARTNER_CONSOLE_SESSION_SECRET`. Keep `PARTNER_API_ORIGIN=https://swapgo.me/api/partner` to use the public API. For a local SwapGo.me backend, use its Partner API base URL instead.

Then install and start the console:

```bash
npm ci
npm run dev -- --hostname 0.0.0.0 --port 3100
```

Open `http://localhost:3100/` and paste a Partner API key on the connection screen. `PARTNER_API_KEY` is an optional development-only shortcut; leave it empty for the normal connection flow. Production builds intentionally ignore that fallback.

## Configuration

| Variable | Visibility | Purpose |
| --- | --- | --- |
| `PARTNER_API_ORIGIN` | Server only | Partner API base URL, normally `https://swapgo.me/api/partner`. |
| `PARTNER_CONSOLE_SESSION_SECRET` | Server only | At least 32 random characters used to encrypt the connected API key in the session cookie. |
| `PARTNER_API_KEY` | Server only | Optional DEV-only key fallback. Never set it in a production deployment. |
| `NEXT_PUBLIC_MAPTILER_API_KEY` | Browser visible | Shared MapTiler key included in `.env.example`. Replacing it with your own key is recommended because the included key's limits are shared by every console installation. |

All `.env*` files are ignored except `.env.example`. Never commit `.env.local`.

## MapLibre and MapTiler

SwapGo.me provides canonical city slugs, ISO3 country codes, currency identifiers, names, and point coordinates. It does not provide map tiles or an iframe picker through Partner API.

This console keeps the complete MapLibre picker and point-map implementation. The shared browser key in `.env.example` makes maps work after the documented setup. A partner may replace it at any time by either:

1. opening **API & map setup → MapLibre + MapTiler** and pasting another MapTiler style URL or browser key; or
2. changing `NEXT_PUBLIC_MAPTILER_API_KEY` in `.env.local` before starting or building the console.

A MapTiler browser key is necessarily visible in the browser. Replacing the included key with your own MapTiler key is recommended because its limits are shared by every console installation. Never substitute the server-side SwapGo.me Partner API key.

## Security model

- the Partner API key is validated server-side and never returned to the browser;
- a manually connected key is encrypted with AES-256-GCM in an `HttpOnly`, `SameSite=Strict` cookie;
- production cookies are `Secure` and expire after eight hours;
- BFF routes use an explicit method/path allowlist, reject cross-origin mutations, and enforce body-size ceilings;
- writes forward `If-Match` and `Idempotency-Key` as required by Partner API;
- the upstream API independently enforces organization ownership, permissions, rate limits, replay safety, and audit records;
- uploaded files and API responses are not stored by this repository.

Treat this as a reference client, not as a reason to expose Partner API directly to browser code. Review your own deployment, proxy, TLS, logging, and secret-management configuration before production use.

## Checks

```bash
npm run quality
```

This runs TypeScript checking, ESLint, and a production Next.js build.

## License

MIT. See [LICENSE](LICENSE).
