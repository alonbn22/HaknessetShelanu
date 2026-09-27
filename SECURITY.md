# Security policy

## Reporting a vulnerability

Please **do not** open a public issue, discussion or pull request for security
vulnerabilities.

Report privately via **GitHub Security Advisories**: open the repository's
**Security** tab → **Report a vulnerability** (GitHub Private Vulnerability
Reporting), or go straight to
<https://github.com/alonbn22/HaKnessetSheli/security/advisories/new>. Only the
maintainers see the report. Include what's affected (a URL or file), the steps to
reproduce, and the impact you expect. We aim to acknowledge reports within a few
days and to credit reporters who wish to be credited.

If the button isn't there, open a public issue that only asks for a private
contact, with no details of the problem.

## Scope

This is a read-only public site backed by a committed SQLite database; it stores
no visitor accounts or personal data. The most relevant areas:

- the data-sync scripts (`scripts/sync/`), which fetch from the Knesset API,
  Wikidata, and data.gov.il;
- the translation/query helpers (`src/lib/`);
- user-input surfaces (search inputs, the ticket form).

Automated tests in `tests/security/` already cover SQL-injection resistance,
HTTPS-only outbound requests, absence of hardcoded secrets, the XSS surface, the
translation-proxy safety limits, and the response-header/CSP posture below.

## Response headers & Content-Security-Policy

The site ships a strict, mostly self-only security posture. Two layers set it:

- **Per-request CSP** (`src/proxy.ts`, the Next.js middleware). `script-src` is
  the real defense: `'strict-dynamic'` plus a fresh per-request **nonce**. Next.js
  stamps that nonce onto its own framework/bundle scripts and onto the single
  hand-written inline script (the pre-paint theme snippet), so any *injected*
  `<script>` — which can't know the nonce — is refused. `object-src 'none'`,
  `base-uri 'self'`, `form-action 'self'`, and `frame-ancestors 'self'` close the
  remaining classic vectors; `img-src` is limited to self + the two Wikimedia
  hosts photos load from. `'unsafe-eval'` is **dev-only** (React debug stacks) and
  never present in production. Because nonces require it, every route renders
  dynamically (the root layout reads a request header to force this).
- **Static headers** (`next.config.ts`): `Strict-Transport-Security`
  (`max-age=63072000; includeSubDomains; preload`), `X-Content-Type-Options:
  nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options:
  SAMEORIGIN`, and a locked-down `Permissions-Policy` (camera/microphone/
  geolocation denied).

Every external link opened with `target="_blank"` carries `rel="noopener"` to
block reverse-tabnabbing, and every DB-sourced URL rendered into an `href`
(committee documents, broadcast/agenda links, bill PDFs, Wikipedia links) passes
the `safeHttpUrl` scheme guard — trimmed, http/https only, anything else dropped
(defense-in-depth over React's own `javascript:`-href sanitization).
`tests/security/` locks all of the above in — the header set, the CSP shape, the
nonce actually reaching the theme script, the `rel="noopener"` rule, and the
scheme guard — so a refactor can't silently weaken it.

## Supported versions

The site is deployed from the default branch; security fixes land there.
