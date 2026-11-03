# Incremental Cloudflare releases

Build with `corepack pnpm run build`, then deploy this repository's `wrangler.jsonc` using the existing authorized Cloudflare credentials outside the repository. Do not use the parent template's deployment config.

## Outputs

- `dist/client`: complete standalone HTML, kept compatible with local preview and Sites.
- `dist/server` and `dist/.openai`: existing Sites packaging, unchanged.
- `dist/cloudflare`: content templates plus current static assets; this is the production asset directory.
- `cloudflare/runtime.generated.json`: current hashed JS entry, stylesheet/inline CSS and shared navigation shell, bundled into the existing Worker.
- `.build-cache`: local incremental fingerprints and OG render cache; not deployed or committed.

The existing Worker streams the shared runtime into HTML templates. It does not fetch an extra database, proxy media or wait for client rendering. Inline CSS on listings is preserved. Canonical, metadata, JSON-LD, pagination and HTML content stay in the page templates. Sites continues to receive complete HTML rather than placeholders.

## What changes on release

- Shared interaction JS, CSS or navigation shell: updated hashed assets plus Worker bundle. Content templates remain byte-identical.
- A recommendation comment: its JSON asset and corresponding video HTML template.
- A video record/ranking/category change: affected listings, detail/related pages, data and sitemaps may change. These are real dependencies and must be rebuilt.
- A global card/content template change: can legitimately update all affected pages.

Content output is compared before writing; unchanged Cloudflare files retain their mtimes. The content generator still evaluates the catalog to calculate correct dependencies rather than assuming a change affects only one page. OG images are rendered only when their text, font or renderer changes. Unreferenced generated pages, stale hashed assets and removed public files are excluded/pruned.

## Cache correctness

HTML is composed from a content asset and a runtime version. Therefore content-only ETag/Last-Modified/Range conditions are removed before the asset request; those validators are not forwarded on composed HTML. HTML uses `Cache-Control: no-cache`; hashed JS/CSS retain immutable caching. This prevents a 304 for unchanged content from keeping an old runtime after deployment.

## Checks

```
corepack pnpm run build
node --test tests/data.test.mjs tests/sites-worker.test.mjs tests/seo.test.mjs tests/worker-routing.test.mjs tests/performance.test.mjs tests/release.test.mjs
```

`tests/release.test.mjs` checks every generated page's lossless composition, shared-runtime independence and write-if-unchanged behavior. The production bundle is derived from the current Vite manifest and source public inventory, not a directory containing historical build leftovers.

The first migration must replace existing HTML with independent content templates once. Future uploads depend on changed bytes, not the total page count. Wrangler still scans the asset manifest; this is expected. No new Cloudflare resource or paid service is introduced.

## Measured local validation — November 2, 2026

Actual source-edit/rebuild experiments (all temporary edits restored before deployment):

| Experiment | Build time | Changed HTML | Changed static files |
| --- | --- | --- | --- |
| No changes | 19.42 s | 0 | 0 |
| JS + CSS + navigation shell changed | 20.75 s | 0 | 3 hashed JS/CSS assets |
| One video comment changed | 18.77 s | 1 | 1 HTML + 1 comment JSON |

These are local build/asset-diff measurements, not predicted network deployment times. The final restored manifest exactly matches the baseline. Public data and the other chat's uncommitted pipeline files were not changed in the release.

21 automated tests passed. A separate smoke test in the actual Cloudflare workerd runtime verified homepage, directory pagination, video detail, Books and 404: shared styles/scripts/navigation are inserted, no placeholders remain, and obsolete conditional cache headers cannot return stale composed HTML. Homepage output is still 70,655 bytes, identical to the performance-optimized page before the migration.

## Production verification

- Migration: 7,472 HTML templates uploaded once in 339.15 seconds; Worker upload completed in 369.06 seconds. Migration version `0cb55936-79b8-4a7a-829d-edb8f8a5e633` served 100% of traffic.
- Subsequent real unchanged deployment: **no updated static assets to upload**; Worker upload completed in **40.99 seconds**, total command wall time **50.94 seconds**. This measures an unchanged deployment, not a promise that every future change takes the same time. Add approximately 20 seconds for the separately measured build.
- Both deployment commands reached publication, then reported the pre-existing zone route-list permission error. Deployment API and live HTTP/browser checks independently confirmed activation; token permissions were not broadened.
- Post-migration report: https://pagespeed.web.dev/analysis/https-hacker-tube-org/tbm8d0a11n . Mobile and desktop performance/accessibility/best-practices/SEO all **100**. Mobile LCP 1.5 s, desktop LCP 0.5 s, CLS 0. These are individual lab runs, not a field-data guarantee.
- Live homepage still returns 70,655 bytes with complete first-screen content, inline styles and the same hashed JS entry. The sitemap, directory pagination, category, detail and reserved Books page all returned 200.
