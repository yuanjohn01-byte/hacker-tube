# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Approved launch scope — 2026-11-02

User approved deployment to hacker-tube.org and the HackerTube header brand. This standalone app is separate from the parent Glorify template. Cloudflare Worker name: hacker-tube. Use wrangler.jsonc here; never deploy the parent configuration. Keep Books and GitHub reserved. Videos and images load directly from YouTube; do not proxy video media. No credentials belong in this directory.

## Approved frontend direction — 2026-11-02
Keep the original HackerTube text wordmark and existing favicon; the generated orange play-arrow logo was rejected. Keep OG artwork. Use the supplied PickedTube Books HTML as the layout reference: grouped Sources / Your library / Explore navigation, distinct source icons, type chips, 16:9 thumbnails and neutral book stages with portrait covers. Rename Watch later to Saved while retaining existing stored saves. Show real HN recommendation signals on video cards. New content types remain explicitly Soon until actual sources are available. Never present reference mock recommendation counts or placeholder comments as real evidence.

## Incremental production releases — 2026-11-02
Production uses `dist/cloudflare` content templates plus `cloudflare/runtime.generated.json` bundled in the existing Worker. Always run `corepack pnpm run build` before deploying this project's wrangler.jsonc. Keep shared JS/CSS/navigation independent of content templates so UI-only updates do not re-upload all pages. `dist/client` remains complete HTML for preview/Sites; do not switch production assets back to it. See `docs/release-workflow.md` and run `tests/release.test.mjs` when changing build/runtime composition. Never deploy benchmark edits or include the other chat's uncommitted pipeline work.
