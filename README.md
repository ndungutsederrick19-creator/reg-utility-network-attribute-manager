# REG Utility Network Attribute Manager

A dependency-free browser app for the REG ArcGIS Enterprise portal at https://gisweb.reg.rw/portal/. It reads real service metadata after authentication and supports reviewed attribute updates and complete XLSX exports. No account credentials, client secrets, live tokens, invented REG fields, or live data are embedded in the application.

## Username and password sign-in (default)

Click **Sign in with REG Portal** to open the app's REG login form. Enter your REG username and password. The app sends them by HTTPS POST directly to `https://gisweb.reg.rw/portal/sharing/rest/generateToken`, with a one-hour requested expiry and a token bound to this app's origin. No client ID is needed for this method. The password is cleared from the form before sending and is not saved to localStorage, sessionStorage, GitHub, Netlify, or an app server. Only the issued token stays in memory. Subsequent API requests send an origin-only Referer required by the token binding.

This works only for accounts REG accepts through token generation and if REG permits CORS from the hosting origin. Accounts using SAML, IWA, SSO or MFA may require OAuth instead. OAuth PKCE remains available as a secondary button when a valid client ID is configured in `dist/config.js`. No real REG login has been tested. Avoid submitting passwords into chat; enter them in the login form yourself.

## Deploy to Netlify (fastest)

1. Extract the ZIP. Drag the **dist folder** to Netlify's manual deployment page. This folder contains the complete static application and security headers.
2. Keep the site's URL stable; rename the Netlify site before registering OAuth redirects.
3. Configure `dist/config.js` once with the registered client ID and exact redirect URL, then open the deployed app and click **Sign in with REG Portal**. A redirect looks like for example `https://your-site.netlify.app/`. The slash matters. The redirect must exactly match the app URL and the registered redirect. Do not use a query string or fragment.
4. Sign in on the REG portal. The app exchanges the returned authorization code using its one-time PKCE verifier. There is no client secret.

For Git-connected Netlify deployment: push this entire repository to GitHub, import it in Netlify, leave the build command empty, and use `dist` as the publish directory. `netlify.toml` supplies these settings.

## GitHub deployment

GitHub stores source code; **GitHub Pages** hosts the website. A Netlify deployment connected to a GitHub repository is also supported.

1. Create a **private** repository named `reg-utility-network-attribute-manager` and upload the complete extracted project, including hidden `.github` files. The user's LV Pole reference image contains asset information; remove `dist/assets/lv-pole-reference.png` and its reference section in `dist/index.html` before making the repository or site public if it is not approved for public sharing.
2. GitHub Actions runs the tests on every push and pull request.
3. For GitHub Pages, open repository Settings → Pages → choose **GitHub Actions**, then run the **Deploy GitHub Pages** workflow from Actions. Pages availability for private repositories depends on your GitHub plan. A Pages site can still be publicly accessible even when its repository is private; verify the hosting audience before deployment.
4. Register the final Pages redirect, typically `https://YOUR-ACCOUNT.github.io/reg-utility-network-attribute-manager/`, with REG's portal application. All asset paths are relative and support a repository subpath.

## Optional OAuth / SSO registration

Ask a REG portal administrator to register a browser application and supply **only the public client ID and exact permitted redirect URL**. You do not need to provide credentials to the app builder. Register an application in the REG Enterprise portal, not in an unrelated ArcGIS Online organization. PKCE requires ArcGIS Enterprise 10.8.1 or later; the specific REG installation's support has not been authenticated or verified.

The portal and federated feature services must permit cross-origin browser requests from the deployed app's HTTPS origin. They must have trusted certificates. Browser CORS, server authorization, licensing, and portal policies cannot be overridden by this static app. Configure CORS with the administrator if sign-in or service requests fail. Do not place a client secret in `config.js`, Netlify variables exposed to the browser, or GitHub.

The administrator sets the public registration defaults in `dist/config.js`. Users see only **Sign in with REG Portal**, then enter their username and password on the REG portal. A missing client ID stops sign-in locally with a setup message, rather than sending an invalid authorize request. Previously saved browser client ID entries are discarded. Tokens are held in memory only, expire according to the token response, and are never stored in localStorage. Reloading requires a new sign-in. The one-time verifier, OAuth state, and registration settings are stored in sessionStorage for at most ten minutes and cleared after callback. The callback query is removed from browser history before token exchange. Sign-out clears app state; it does not sign out of the portal's own session. No automatic refresh token storage is implemented.

## Workflow

- Discover accessible Feature Service portal items. Search is paginated. Alternatively open an exact HTTPS FeatureServer service root. Approve any additional origin only if it is a trusted REG server; approval permits the token to be sent there.
- Select a feature layer or non-spatial table. All fields, aliases, types, subtypes, domain definitions, nullability and row values come from the service. The screenshot is a visual reference only.
- Inspect the attribute table, schema, page null counts and domain violations. Apply a server-side WHERE expression when needed. The server validates filter syntax. `NULL`, empty strings, and coded “Unknown” values are distinct.
- Select one record, change permitted fields, review old and proposed values, and explicitly confirm saving. Numeric, string-length, GUID, date, coded-value and range validation apply. Subtype domains are honored; subtype and geometry changes are deliberately disabled.
- Saving re-fetches metadata and the current record, checks ownership, permissions, subtype and changed field values, and submits a minimal attribute update. Server update results must report success. Pre-save conflict checking is not an atomic compare-and-swap: a concurrent edit after checking can still race; coordinate editing with your team.
- Export **all matching accessible records**, not just the displayed page. The app fetches the complete object ID list and pages through those IDs. Truncated pages are recursively split. A missing or inaccessible ID aborts export rather than silently producing an incomplete workbook.

The workbook includes raw attributes, schema, subtype/domain metadata, inspection across the exported records, service URL, filter and export time. Coded fields preserve actual codes; the table additionally displays domain labels. Dates remain original ArcGIS epoch millisecond values, documented in the workbook. Strings beginning with `=` are literal strings, not formulas. Nulls are blank Excel cells; empty strings are written as explicit string cells (some Excel readers may display both as blank). Rows over Excel's per-sheet limit are split among attribute sheets. Browser memory limits still apply; very large datasets may need narrower filters or a server-side export. This is a fresh export initiated by the user, not a continuous live Excel link or a database transaction snapshot.

## Editing boundaries

Updates require the signed-in account's edit privileges, a service/layer Update capability, an explicitly editable supported field, and ownership checks where applicable. The server remains the final authority and may reject updates for additional rules or permissions. Unknown privileges fail closed. OID, GlobalID, geometry, subtype, unsupported field types, versioned data and archived data are read-only. Versioned Utility Network services should be edited through a separately approved version management/session workflow; this package does not implement branch-version locks, reconcile/post, topology validation, associations, or bulk updates. Read and XLSX export remain available where permitted. No attribute is auto-filled from the screenshot or guessed.

## Local development and verification

Install Node.js 22 or later. There are no npm dependencies or installation step.

```text
node --test tests/*.test.mjs
node server.mjs
```

Open `http://127.0.0.1:4173/` for the local preview. Local sign-in requires its exact redirect to be registered too. Production deployment uses HTTPS. Tests use synthetic fixtures, never REG records or credentials. See `TEST-REPORT.md` for the verification performed on the supplied package.

## Files

`dist/` is the deployment artifact. `dist/config.js` holds public defaults. `dist/core.js` contains REST, pagination and validation logic. `dist/xlsx.js` generates a standards-based XLSX ZIP without external runtime libraries. `dist/app.js` controls the UI. `.github/workflows/` contains test and manual Pages deployment workflows. `netlify.toml` configures Netlify. `server.mjs` is for local preview only; no server is required in production.

## Official references

- Esri PKCE: https://developers.arcgis.com/authentication/browser-based-user-logins/
- ArcGIS authorize and supported versions: https://developers.arcgis.com/rest/users-groups-and-items/authorize/
- Token exchange: https://developers.arcgis.com/rest/users-groups-and-items/token/
- Complete ID-based queries: https://developers.arcgis.com/rest/services-reference/enterprise/query-feature-service-layer/

This is an independently prepared tool, not an official REG or Esri product. Successful live REG sign-in, service discovery, editing and export must be acceptance-tested by an authorized account after registration. Use a disposable approved test record for the first write test.


