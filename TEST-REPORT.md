# Verification report — 14 October 2026

## Workbook field allowlist — 15 October 2026

38 automated tests pass. Tests cover worksheet group extraction, conservative field-name/alias matching, unmatched headings without invented mappings, and editing restrictions outside the active group. A synthetic browser test verified that choosing Transformer reduced the table to the matching workbook attribute, the record editor and bulk dropdown exposed the same attribute, and the downloaded Excel template contained only that attribute plus the required Global ID linkage. The template headers and row count were independently verified. Real REG data/schema was not modified by this filtering work.

## Bulk update and Excel import update — 15 October 2026

34 Node tests pass, including multi-ID queries, header/ID matching, blank versus explicit NULL handling, duplicate and invalid data rejection, per-record permission/domain checks, pre-save conflict checks, single-request batch submission, mixed/unknown outcome reporting, duplicate-submit prevention, and XLSX ZIP integrity validation. Four additional browser parser tests pass for inline/numeric cells, shared strings and formatted dates, formula rejection, and unsafe XML declaration rejection. Synthetic browser tests searched for two Global IDs, reviewed and saved a shared field on both records, imported a compressed XLSX with different field values per device, reviewed and saved both, downloaded the actual edit template, and re-imported it unchanged with zero proposed updates. The downloaded template was independently read successfully. Production REG writes remain untested; no real account credentials or production rows were used in fixtures.

## Direct default-version editing update — 15 October 2026

23 automated tests pass. Additional coverage verifies that versioned edits require a server-verified default version and explicit enablement; account, field, ownership and audit restrictions still apply; queries and writes carry the same gdbVersion without named-version session IDs; version metadata uses header authentication. Browser testing with a synthetic versioned service verified selecting the default target, enabling editing, typing into a NULL field, reviewing the target and before/after values, and saving through applyEdits. The synthetic server required the correct version parameter and the updated value was reloaded. No production REG write was performed. Earlier statements about blanket versioned editing restrictions below describe the initial release and are superseded by this update.

## Passed

- 10 Node.js automated tests: RFC 7636 S256 PKCE vector; secure URL restrictions; null, domain, string, numeric and range validation; permission/ownership/versioning checks; subtype domains and null inspection; complete multi-page export with recursive truncation recovery; missing-record abort; expired sessions/unapproved origins/REST errors; paginated discovery; XLSX ZIP/text/numeric encoding.
- JavaScript syntax checks for the UI, core and workbook modules.
- Browser UI with synthetic fixtures: OAuth callback handling, discovery, service selection, layer schema and table display, null metrics, read-only object ID, numeric and date edits, review of old/proposed values, explicit save and updated table.
- Browser XLSX download: 3 synthetic records exported in 5 worksheets; independently opened using Python openpyxl, verifying all records and updated numeric/date values.
- Independent XLSX fixture validation using openpyxl: formula-like string remains literal text, numeric cells remain numeric, blank null cells and escaped XML round-trip correctly.
- Production sign-in screen and LV Pole image rendered in the browser with no authenticated state asserted.

## Not verified against live REG

No REG credentials or OAuth registration were provided. Live authentication, portal version/PKCE support, CORS configuration, accessible service discovery, real schema, real account permissions, database rules and real updates have not been tested. The automated and UI tests use explicitly synthetic fixtures. Versioned/archived editing is disabled. Server-side authorization is always authoritative.

## Hosting status

This package contains ready-to-upload Netlify static files, GitHub Actions checks and a manually triggered GitHub Pages deployment workflow. No hosted deployment is claimed by this report. GitHub upload requires an accessible target repository. OAuth requires the public client ID and exact registered redirect of the final host.

## Reproduce

Run `node --test tests/*.test.mjs`. For the synthetic browser test, run `node tests/ui-server.mjs` and visit `http://127.0.0.1:4174/__tests__/harness.html`. Synthetic data appears with a prominent test notice; no REG calls are made. The test server and fixtures are outside `dist` and are not part of the deployed site. Run `node server.mjs` for the real unauthenticated local app.

## Username/password login update
Four additional synthetic tests pass (14 total): fixed REG HTTPS endpoint and POST/origin binding, clearing request passwords, missing credentials/insecure origin rejection, generic rejected-login errors, invalid expiry and CORS handling. The username/password modal was verified locally. No real account authentication is claimed.
