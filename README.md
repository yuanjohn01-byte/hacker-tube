# HackerTube

An independent recreation of [HackerTube](https://hackertube.org), the project initiated by [Andrej Karpathy](https://x.com/karpathy). This edition lives at [hacker-tube.org](https://hacker-tube.org). It is not the original site and is not affiliated with or endorsed by its creators.

Start with people's recommendations, then use software to organize them. Video pages retain original channels and Hacker News discussion links. Videos play through YouTube; this application does not host or proxy video files.

## Status

- Video browsing, topics, playlists, search, likes, history and saved items.
- Page-specific metadata, static HTML generation, sitemaps and Open Graph images are deployed; production page, redirect, 404 and sitemap checks passed on November 2, 2026.
- Sources navigation is prepared for podcasts, papers, books and GitHub. These collections are **Soon**. Illustrative examples are labeled and have no fabricated HN counts or comments.
- The GitHub collection pipeline is at the preparation stage, with collection and classification disabled. See [GitHub preparation](docs/github-preparation.md).
- Podcast playback, real cross-source search and source-specific live metadata require actual collected data and are not shipped features yet.

## Development

Requires Node.js, pnpm 10.30.3 through Corepack, Python 3, and Pillow for OG rendering. Install dependencies with `corepack pnpm install` and run `corepack pnpm dev`.

The local video snapshot is deliberately excluded from Git. The UI/build expects `public/data/videos.json`, `browse.json`, `playlists.json`, `playlist-details.json`, `related.json`, and `comments/<video-id>.json`. These are the application's normalized snapshot, not the original JSONL export. Obtain a compatible snapshot separately; do not commit raw comments, media caches or credentials. See [source data documentation](public/DATA.md) for the upstream export and attribution. This repository does not yet provide a standalone upstream-to-normalized-data importer.

With the normalized data present:

```sh
corepack pnpm build
corepack pnpm test
corepack pnpm test:sites
corepack pnpm test:seo
node --test tests/worker-routing.test.mjs
python3 -m unittest discover -s tests -v
python3 scripts/preview-seo.py
```

The SEO preview is served at `http://127.0.0.1:4176`. It previews generated pages; production redirects and response headers are implemented separately by the Cloudflare Worker.

## Layout

- `src/`: shared UI, source examples, catalogue operations and SEO metadata.
- `scripts/build-seo.mjs`: HTML pages, sitemaps and generated route manifest.
- `scripts/build-og.py`: typographic Open Graph cards.
- `cloudflare/worker.js`: production HTML routing, canonicalization and status codes.
- `pipeline/`, `config/`: independent GitHub collection preparation.
- `docs/DEVELOPMENT_HANDOFF.md`: frontend/data coordination and current limitations.

Use only this project's `wrangler.jsonc` for deployment. Authenticate outside the repository. A build generates `cloudflare/routes.generated.json`, `cloudflare/runtime.generated.json` and `dist/cloudflare`; never deploy before building. Shared JS/CSS/navigation is composed by the Worker so UI-only releases do not re-upload the content pages. See [incremental release workflow](docs/release-workflow.md). The separate `worker/` and `.openai/` files retain prototype hosting compatibility.

## Credits and rights

See [NOTICE.md](NOTICE.md). Public source availability is not a blanket license to the original website, third-party datasets or videos. Preserve source credits and any applicable licenses when reusing material.
