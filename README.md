# Current Excel save workflow

Upload a workbook, match actual service field names or unique aliases, and edit supported fields. Identical duplicate columns are included once; conflicting duplicates require an explicit mapping or Ignore choice. Locked identifiers/classification fields, server read-only fields and workbook-excluded columns remain reference data and are not submitted as attribute changes. Global ID is retained for record matching. Account, record ownership, service capabilities and domains are checked before saving.

The Apply button saves directly after validation. Status, validation errors and per-device results appear in the Save section next to it. A fresh read from the same version checks accepted values. Only matching read-back results are labelled Saved and verified; unavailable or different values are reported separately. Submitted uploads cannot be resent automatically. Production REG writes have not been performed by the development tests.

# REG Utility Network Attribute Manager

## Workbook attribute filter

The supplied `Data_collection_template Updated Version (2).xlsx` defines the allowed business attributes. `dist/attribute-profiles.json` contains only its extracted attribute headings, grouped by its 15 worksheets; the original workbook and its other cell contents are not published. **All workbook attributes** is the default view. Choose **Transformer**, **LV_Support**, **Substation**, or another workbook group to narrow it further. The chosen group follows the selected layer/table and applies to devices, junctions, lines and other feature classes.

Fields match actual service names or aliases after case, whitespace and punctuation normalization. No semantic/fuzzy mapping or missing field creation is performed. The interface reports unmatched workbook headings. A group with no matching service fields stays empty rather than showing unrelated attributes. The filter governs the attribute table, schema/null inspection, record editor, regular XLSX export, bulk field selector and Excel edit template. Changed fields outside the selected group are rejected during import/save validation. Edit templates retain a Global ID linkage column for record matching, even when Global ID is not listed as a workbook business attribute. This is an application visibility/editing filter, not a database schema modification or server access restriction.

## Bulk transformer / device updates

Select the correct feature layer or table. For versioned data, enable direct edits to the verified default version. Paste multiple Global IDs into the search box (one per line, or separated by commas/semicolons). Search respects the applied WHERE filter. Bulk tools operate on **all matching records across pages**, with a limit of 500 devices per reviewed batch.

- **Shared change:** choose **Set a field on all matching devices**, select the field, enter a value/domain code or exact domain label, and prepare a review. Each record is validated against its own subtype domain, permissions and ownership.
- **Different values per device:** choose **Download Excel edit template**. Keep the Global ID column unchanged. Fill in the **Edits** worksheet using its actual service field headers. Keep other worksheets for guidance. Upload the completed `.xlsx` file; workbooks with an `Edits` worksheet use that sheet, otherwise the first visible sheet is read. Older `.xls` files must be saved as `.xlsx` first. The file is read in the browser, not uploaded to an app server.
- Blank Excel cells mean **leave unchanged**. Write `__NULL__` to clear a nullable field or `__EMPTY__` to write empty text. Use domain codes or exact labels. Date cells may be formatted Excel dates, ISO timestamps or the original exported epoch millisecond values. Unformatted numeric date serials are rejected as ambiguous. Duplicate Global IDs, unknown/ambiguous column headers, formulas, invalid values and missing/inaccessible records block the entire review. Existing records only; this does not create transformers or update geometry.
- Review every before/after value and the target service/version. Only **Confirm and save all reviewed devices** sends edits. The app re-fetches metadata and all affected records, rechecks permission/domain/version/subtype and changed-field conflicts, and sends one `applyEdits` request with rollback requested. Pre-save checking is not an atomic compare-and-swap; concurrent writes can still race after the check.
- Inspect the per-device save report. Every record must have its own successful server result before it is reported saved. Mixed failure responses are flagged for verification rather than claiming rollback succeeded. A lost connection or ambiguous response is an **unknown outcome**: refresh the server records before preparing another batch. Submitted reviews cannot be sent again automatically. Batch import ignores the Global ID search box when matching uploaded IDs but still respects the applied WHERE filter.

Limits: 500 device rows, 1500 columns and 25 MB compressed workbook size, with bounded decompression. Standard XLSX ZIP entries, inline/shared strings and date-formatted cells are supported. Unsupported/encrypted/corrupt workbooks are rejected. Network rule or permission errors remain authoritative on the REG server. No production records were changed during development tests.

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

Updates require the signed-in account's edit privileges, a service/layer Update capability, an explicitly editable supported field, and ownership checks where applicable. The server remains the final authority and may reject updates for additional rules or permissions. Unknown privileges fail closed. OID, GlobalID, geometry, subtype, editor tracking and unsupported field types remain read-only, with a reason beside each field. No attribute is auto-filled from the screenshot or guessed.

For versioned Utility Network feature services, the app reads `VersionManagementServer` to verify the default version's name and GUID. Queries and exports then use that explicit `gdbVersion`. To edit, select **Enable direct attribute edits to this live default version**, open a record, edit permitted values, review the target version and changes, then **Confirm and save to UN service**. This is an immediate update to the default version through the layer's `applyEdits` operation, not a local-only draft or a file upload. The default version is rechecked before saving. No edit session ID or lock is used for direct default edits. If default-version discovery fails, versioned editing stays disabled and displays the reason. A protected default version or additional server rules may still reject an update.

This package does not implement named-version sessions, branch-version locks, reconcile/post, topology validation, association management, geometry updates or device creation. Use your approved ArcGIS workflow when those operations are required. Missing values can be filled by typing directly; typing unchecks **Set NULL**. Select **Set NULL** explicitly to clear a nullable field. Server responses determine whether each save succeeded.

## Local development and verification

Install Node.js 22 or later. There are no npm dependencies or installation step. XLSX import uses the browser XML parser and native ZIP decompression.

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



## Global ID search
After selecting a layer or table, paste a complete Global ID into **Find a record by Global ID** and click **Find Global ID**. Braces are optional. Search uses the actual Global ID field from service metadata, scans all accessible matching records through a server-side filter, and combines with the applied WHERE filter. Clear search restores the applied WHERE results. Click a matching row to inspect/edit. XLSX export respects the active Global ID search. Layers without a Global ID field show an explanatory message.


## Survey Quality Monitor

Sign in, open a Feature Service in Attribute Manager, and use the Survey Quality Monitor tab. Load the service's layers, select each device/junction layer and explicitly choose its required fields. The dedicated checking template is still pending; no mandatory field rules are inferred. Find usernames reads every accessible record across all pages of the selected layers and lists distinct creator or last-editor usernames using the service's editFieldsInfo metadata. This is an observed-record inventory, not a complete portal staff directory; accounts without accessible records cannot be listed. Tracking accounts may be sync users rather than individual surveyors. Layers without the selected tracking field are reported as uncovered.

Select usernames and Check now, or Start monitoring at 1, 5 or 15 minute intervals. Issues identify the username, layer, GlobalID (or object ID), required field and missing value type. NULL, empty and whitespace values trigger; zero, false and coded Unknown values do not. An unchanged issue is not notified again. Scan coverage errors are shown and do not clear the previous issue baseline. Monitoring is read-only and does not call applyEdits. Desktop notification permission is optional and requested only from the explicit Enable desktop notifications button. No email, SMS, closed-app checks or stored credentials are used. Keep the app open and signed in; suspended/background browser tabs can delay polling.

### Choosing the username value field

Each monitored layer now has a Username field selector containing actual text fields. Editor-tracking metadata is preferred; when creator metadata is absent and an actual created_user text field exists, it is shown as the initial source. Select the exact source field used in ArcGIS Pro, then Load username values. This inventory scans all accessible rows, not just the current attribute-table page or manager WHERE filter. Monitoring uses that same selected source field. Changing it clears the old username selection and stops the prior monitor configuration. The search reports visible / total username counts, including an explicit zero-match message. No organizational account list is invented or hardcoded, and the app cannot bypass the portal or feature service access controls.

### Saved monitoring links and partial record access

The linking form saves the selected usernames, layer URLs, username fields, required attributes, interval and link name in localStorage, scoped to the signed-in portal and account. No passwords, session tokens or feature attributes are stored. Open the same approved Feature Service and Restore saved monitoring link after signing in again; actual schemas and access are rechecked and monitoring does not start automatically. Saved usernames no longer visible in the current snapshot remain clearly labelled saved selections. Browser storage clearing removes the saved link.

A listed object ID can disappear or become inaccessible before reading its attributes. Monitor reads now retain readable records and record skipped IDs as PARTIAL coverage instead of discarding the entire username list. Layer-wide request failures remain explicit failures. Incomplete scans never claim complete coverage or clear unresolved issue baselines. Ordinary export and edit workflows retain their stricter missing-record behavior. Username activity means presence in readable feature records; it is not online-session presence or a full portal roster.

### Creator list matching ArcGIS Pro

Creator mode now prefers an actual created_user text field over another metadata-reported account field. The username inventory first requests distinct values from that selected field using returnDistinctValues=true and returnGeometry=false. A complete value response avoids record-by-record failures; truncated, unsupported or invalid distinct responses fall back to the paginated readable-record inventory with explicit partial coverage. No full roster or online presence is claimed. See https://developers.arcgis.com/rest/services-reference/enterprise/query-feature-service-layer/.

Each returned username is independently selectable. Select all shown respects the current search; Clear selection removes all checks. The selection counter and saved monitoring link preserve the selected exact username values. Add exact usernames accepts a pasted list as a local fallback and labels those names unverified until their accessible records can be matched. This does not grant permissions or claim the accounts exist. No names from screenshots or videos are hardcoded into the public application.

### Return to a query

After a layer is opened, query settings are saved automatically in this browser, scoped to the signed-in portal and username. The next sign-in offers Restore saved query, Continue current session, or Start new query. Saved query / return options reopens these choices. Restore reloads the service schema and current records, reapplies the workbook attribute group, WHERE filter, Global ID search and page, and restores the selected monitoring layers, username fields, required attributes, usernames and interval across all three spaces. Permissions and cross-origin approval still apply. Monitoring stays stopped after restore. Continue leaves the current session alone; Start new query removes the saved query and clears working selections and prepared upload/edit data. This saves one latest query, not a query history.

No passwords, tokens, feature rows, Excel contents or pending edits are persisted by query saving. Browser storage clearing removes the saved query. Changes made before this feature was installed cannot be recovered automatically. Saved monitoring links remain a separate explicit preset.

### Easier monitoring of the three network layers

Known Electric Device, Structure Junction and Electric Line layer names are selected when monitor layers load. Select all three network layers selects available layers assigned to these spaces, reports missing/unlinked spaces, and refreshes usernames. If service labels differ, assign each actual layer with its Monitoring space selector; this does not rename service data. Check all attributes is an explicit choice to treat every offered non-system attribute in that layer as required; optional fields may otherwise remain unchecked.

Monitor all usernames checks every readable record each polling cycle, including future usernames and records lacking attribution. Leaving it unchecked restricts checks to ticked usernames. This option and explicit space assignments persist in query settings and monitoring links. Alerts concern missing required values, not every edit or a guaranteed audit/event stream. No geometry, topology, closed-app monitoring or permission bypass is added.
