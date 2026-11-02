# PageSpeed performance fix — 2026-11-02

## Baseline

User-supplied PageSpeed report `uy07wpz9a3`, captured Nov 2, 2026 at 12:06 PM EST:

| Metric | Mobile | Desktop |
| --- | --- | --- |
| Performance | 67 | 82 |
| Accessibility | 94 | 94 |
| Best practices | 100 | 100 |
| SEO | 100 | 100 |
| FCP | 2.7 s | 0.3 s |
| LCP | 14.2 s | 3.0 s |
| TBT | 50 ms | 120 ms |
| CLS | 0 | 0 |

No CrUX real-user data was available. These are laboratory scores, not field results.

## Cause and change

The site already generates HTML for public pages at build time (SSG) and serves it from Cloudflare. The client discarded the listing grid, then requested the entire video catalog before rebuilding it. The mobile report recorded 1,916.65 KiB transferred for `/data/videos.json`; its final LCP image had been replaced with a lazy-loaded image.

- Preserve prerendered cards on unfiltered Home, Browse, category and area pages. Enhance filter controls and stored saves without replacing those cards.
- Keep the first image eager/high priority and preconnect to YouTube's image origin.
- Generate small static home feed pages (second page: 36 records, 6,952 raw bytes / 2,581 gzip bytes), with the same ranking as the first HTML page. Fetch continuations only when scrolling reaches the end. No media proxy or new backend service.
- Inline the small stylesheet on listing pages and send only card fields in their bootstrap/continuation JSON. The homepage is 70,655 raw bytes / 14,005 gzip bytes; metadata and structured data remain present.
- Keep explicit pagination on directory pages. Filters and search remain client-side and fetch the full catalog on demand.
- Use H2 card headings under H1, and darken orange text in light mode for contrast. Keep the text wordmark and favicon.

The architecture remains static HTML plus client interactions; per-request dynamic SSR is not necessary for this snapshot-based public catalog. Google also recommends server-side or prerendered content for speed and crawler compatibility: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics . An extension marking appended cards as CSR is expected for scrolling and does not imply the initial HTML lacks content.

## Validation before release

- Production build: 7,472 HTML pages, 7,462 indexable URLs, 6,454 video sitemap entries, 195 OG images.
- 18 tests passed across data, performance, SEO, Worker routing and Sites packaging.
- Performance regression tests verify complete home pagination ordering, no duplicate/gap, embedded first-page reuse and small continuation requests.
- Real browser + local HTTP logs: initial home has 36 cards and no `/data/videos.json` request; scrolling appends another page using `/data/home/2.json`.
- Verified Videos chip selection, long-duration filter, second directory page, detail page, stored save restoration and removal.
- Mobile 390 × 844 visual check passed.

## Production validation

First release (`fcf41dc`) was activated at 100%, Worker version `16786d37-8e23-474f-a6f7-0fcf314a25b9`. Uploaded 7,644 changed assets in 743 seconds. The CLI then failed its zone route-list read due to existing token permissions; the deployment API and live asset hash confirmed successful activation. No permissions were expanded.

First rerun: https://pagespeed.web.dev/analysis/https-hacker-tube-org/rjfe1u1fc4
- Mobile 80, FCP 2.7 s, LCP 4.1 s, TBT 40 ms, CLS 0, SI 4.7 s.
- Desktop 100, FCP 0.3 s, LCP 0.5 s, TBT 10 ms, CLS 0, SI 0.4 s.
- Both: Accessibility / Best practices / SEO 100.

Second release (`231177b`) trims bootstrap data and inlines listing CSS. Active Worker version: `a8e8413f-c9b4-4320-ac44-b7935d69f8c4` at 100%. Uploaded 1,145 changed files in 81.97 seconds (97.11 seconds through Worker upload). Same non-blocking route-read permission limitation as the first release.

Final PageSpeed report, Nov 2, 2026 at 12:39 PM EST:
- Mobile: https://pagespeed.web.dev/analysis/https-hacker-tube-org/nk7mivpk1b?form_factor=mobile
- Desktop: https://pagespeed.web.dev/analysis/https-hacker-tube-org/nk7mivpk1b?form_factor=desktop

| Metric | Mobile final | Desktop final |
| --- | --- | --- |
| Performance | 100 | 100 |
| Accessibility | 100 | 100 |
| Best practices | 100 | 100 |
| SEO | 100 | 100 |
| FCP | 0.8 s | 0.2 s |
| LCP | 1.5 s | 0.5 s |
| TBT | 10 ms | 30 ms |
| CLS | 0 | 0 |
| Speed Index | 0.8 s | 0.3 s |

Live GET checks passed (200) for homepage, directory page 2, category, video detail, Books placeholder, small home continuation and sitemap. Browser confirmed inline listing CSS, eager/high-priority hero and 36 initial cards. The page titles, canonical, source credits, GA4 integration and original favicon are retained. Neither new content candidates nor the other chat's uncommitted pipeline work was deployed or committed.

Scores are individual lab measurements and can fluctuate; CrUX still has no field data. Remaining audit notices include third-party cache lifetimes/unused analytics JavaScript. This change does not remove analytics or proxy YouTube media to chase those notices. Filtering/search still load the complete catalog on demand, which is a separate future optimization.

Deployment time is separate from visitor performance: hashed entrypoint changes touch every generated HTML file; this second build-only adjustment keeps JS/CSS hashes unchanged and touches only affected listings/data. Future deployment architecture could decouple shared entrypoints and content builds, but that restructuring is not part of this fix.
