# HackerTube release audit — 2026-11-02

## Scope and content policy

English-language video discovery at hacker-tube.org. The homepage remains a browsing grid, without a long SEO copy block. Author credit distinguishes the original project (Andrej Karpathy) from each video's title and source channel. The About page links Karpathy and the original project, explains independence, data attribution, planned extensions, YouTube playback and GA4.

The user explicitly approved prioritizing real content and browsing experience over the skill's 800-word and 3–5% keyword-density benchmarks. No filler or keyword repetition was added. Original video titles and channel names remain intact even when the title is longer than the preferred character range; this is a disclosed editorial tradeoff, not a passing length score.

## Confirmed before / implemented after

| Check | Before | Current build |
|---|---|---|
| Initial HTML | Generic shell; no main content | Pre-generated page content |
| Title/description | Shared initial metadata | Page-type rules using actual content |
| H1 | Missing in initial HTML | Exactly one on each generated page |
| Canonical / OG / Twitter | Absent | Included per page |
| Sitemap | HTML fallback with status 200 | XML URL sitemap and video sitemap |
| Unknown routes | SPA fallback 200 | Production Worker returns 404 |
| Category navigation | Client-rendered | Crawlable links and numbered pages |
| Credits | Generic | Named original project/initiator and source channels |
| Analytics | Not configured | GA4 G-59MT0DEK42 on production hostname only |

7,472 generated HTML pages; 7,462 indexable URLs; 6,454 video sitemap entries; 195 typographic OG images. Video OG images use the corresponding YouTube frame. Search, private browser library pages, examples and filtered variants are noindex; filters remain crawlable so the noindex directive can be read. No fabricated upload dates, creator identities or review ratings are used in structured data.

## Page mapping

- Home: HackerTube / Hacker News video archive; a screen-reader heading preserves the grid's visual layout.
- Category/area: the actual topic plus video-discovery context; self-canonical pagination.
- Playlist: actual playlist title/pitch and collection links.
- Video: original title and channel, source summary, visible HN context, YouTube embed and VideoObject data.
- About: original project, Andrej Karpathy, source credits, independent recreation and disclaimer.
- Utility/future sources: noindex, clear Soon/example labels. Examples do not enter the real recommendation feed or search index.

## Remaining quality limitations

- 6,102 indexable titles exceed 60 characters, primarily because original titles and channel attribution are retained. No ranking benefit is claimed from length or attribution alone.
- Two video-title pairs are exact duplicates in the source collection, representing different YouTube IDs; they have distinct URLs. No unverified cross-video canonical merge was made.
- This is substantially a recreation of an existing collection. Better technical crawlability does not establish unique editorial value or guarantee indexing/ranking.
- No connected GSC property for hacker-tube.org was available in the earlier audit. Search traffic, index coverage, rich-result eligibility and field Core Web Vitals remain unverified.
- No legal review of the disclaimer was performed. Site owner/contact details were not invented.
- A real mixed-source catalogue, source-specific live filters and persistent podcast playback depend on the separate data work. These remain explicitly unlaunched.

## Validation

Build and Sites packaging checks pass. Existing video data/filter tests, Python preparation tests, new HN-signal/era/durability tests, generated metadata tests, route normalization/404/pagination tests and production-only analytics initialization tests pass. Browser checks confirmed a book example can be saved into the unified library, video cards display actual HN signals, and the tested phone viewport has no horizontal page overflow. Production verification results are recorded separately in the local deployment evidence; this report does not assert a Google indexing result.

## E-E-A-T evidence boundary

Experience is supported by traceable source comments, not first-hand testing by this site's operator. Expertise comes from identifiable original creators; Karpathy's identity is not treated as this clone's author expertise or endorsement. Authority/recognition/backlinks for this new domain were not measured. Trust improved through explicit sources, independence and playback/analytics disclosures, but an identified operator/contact process is still absent. These limitations prevent a claim of strong site-level E-E-A-T merely from imported credits.

## References

- Original project and attribution: https://hackertube.org/about
- Google video guidance: https://developers.google.com/search/docs/appearance/video
- Video structured data: https://developers.google.com/search/docs/appearance/structured-data/video
- JavaScript SEO: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- Crawlable links: https://developers.google.com/search/docs/crawling-indexing/links-crawlable
