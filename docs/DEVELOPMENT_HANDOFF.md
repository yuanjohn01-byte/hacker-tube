# Development coordination — 2026-11-02

## Ownership

Frontend/SEO chat: “分析 HackerTube 爆火原因”. Data preparation chat: “精炼翻译 Claude 文档”. Both currently share this repository. Coordinate before editing shared files or committing; use separate branches/worktrees for concurrent future changes.

Frontend owns `src/`, CSS, SEO build and production routing. Data work owns `pipeline/`, `config/`, Python preparation scripts/tests and its preparation guide. Do not activate collection, classification or paid jobs merely by building the frontend.

## Frontend integration target

Future public records should expose stable `id`, `kind`, `title`, `author`, `url`, `description`, `category`, and actual aggregate `hn.recommenders`, `hn.first_year`, `hn.last_year`, plus attributable comments/source links. This is an adapter target, not an instruction to invent missing fields or override the collection schema. GitHub's numeric repository ID should remain the identity; owner/name is mutable.

The existing video catalogue still uses `vid` and `hn` records. `src/sources.js` holds explicitly labeled examples, not the production source catalogue. Replace examples only after evidence passes collection gates. Saved/history keys prefixed `example:` must not be promoted to real records automatically. Existing video storage keys remain compatible.

## Current preview boundaries

- Sources, type chips, Saved naming and 16:9 visual treatments are implemented.
- Video cards show existing HN counts/year spans; zero-recommendation records are not given invented endorsements.
- Books/papers/repos/podcasts have illustrative cards and detail actions; real data sources remain Soon.
- Video search is grouped and has a See all path; other types have no verified search index yet.
- Video filters support category, first recommendation era, duration and recommendation sorting. Future types need filters backed by their actual fields.
- A persistent podcast mini player is not implemented yet. Current full-document navigation must be adapted before claiming uninterrupted playback.
- SEO production validation, title-length exceptions, full route validation and deployment are still pending. Do not claim the SEO release is live.

## Example sources

Books: titles/authors from the owner-supplied Books HTML; no recommendation evidence imported. Papers and repository examples link to official sources checked on 2026-11-02:

- https://arxiv.org/abs/1706.03762
- https://arxiv.org/abs/1512.03385
- https://arxiv.org/abs/2005.14165
- https://github.com/python/cpython
- https://github.com/react/react
- https://github.com/torvalds/linux
- https://latent.space/p/arca/
- https://latent.space/p/supabase/
- https://latent.space/p/how_anthropic_ships_the_1_llm_in_the_world_safely_separating_the_brain_from_the_hands/

No tokens, raw HN corpus, personal configuration, deployment evidence or local data snapshots belong in Git.
