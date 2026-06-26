# Security policy

## Reporting a vulnerability

Please **do not** open a public issue for security vulnerabilities.

Report privately via **GitHub Security Advisories**: open the repository's
**Security** tab → **Report a vulnerability** (GitHub Private Vulnerability
Reporting). We aim to acknowledge reports within a few days and to credit
reporters who wish to be credited.

## Scope

This is a read-only public site backed by a committed SQLite database; it stores
no visitor accounts or personal data. The most relevant areas:

- the data-sync scripts (`scripts/sync/`), which fetch from the Knesset API,
  Wikidata, and data.gov.il;
- the translation/query helpers (`src/lib/`);
- user-input surfaces (search inputs, the ticket form).

Automated tests in `tests/security/` already cover SQL-injection resistance,
HTTPS-only outbound requests, absence of hardcoded secrets, and the XSS surface.

## Supported versions

The site is deployed from the default branch; security fixes land there.
