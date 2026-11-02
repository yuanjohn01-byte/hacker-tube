import {types, typeChips, signal, sourcePage, examples, exampleCard, exampleDetail} from "./sources.js";
import { aboutHTML } from "./seo/about.js";
import { api, initialPage } from "./data-client.js";

const $ = (s, el = document) => el.querySelector(s);
const view = $("#view");
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem("pickedtube:" + k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem("pickedtube:" + k, JSON.stringify(v)); } catch {} },
};
let likes = store.get("likes", []), dislikes = store.get("dislikes", []);
let seen = store.get("seen", []);           // videos opened, newest last; kept out of the Home feed
// a fresh seed on every page load: reloading rerolls Home, while scrolling and going back from a video keep it
const seed = String(Math.floor(Math.random() * 1e9));
let watchLater = store.get("later", []);   // saved for later, newest last
const CLOCK = '<svg viewBox="0 0 24 24"><path d="M14.97 16.95 10 13.87V7h2v5.76l4.03 2.49-1.06 1.7zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
function toggleLater(vid) {
  watchLater = watchLater.includes(vid) ? watchLater.filter(v => v !== vid) : watchLater.concat(vid);
  store.set("later", watchLater);
  return watchLater.includes(vid);
}
function markSeen(vid) {
  seen = seen.filter(v => v !== vid).concat(vid).slice(-200);
  store.set("seen", seen);
}

// ---------- formatting ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dur = (s) => { if (!s) return ""; const h = Math.floor(s/3600), m = Math.floor(s%3600/60), x = s%60;
  return h ? `${h}:${String(m).padStart(2,"0")}:${String(x).padStart(2,"0")}` : `${m}:${String(x).padStart(2,"0")}`; };
const views = (n) => n == null ? "" : n >= 1e9 ? `${(n/1e9).toFixed(1).replace(/\.0$/,"")}B views`
  : n >= 1e6 ? `${(n/1e6).toFixed(1).replace(/\.0$/,"")}M views` : n >= 1e3 ? `${Math.round(n/1e3)}K views` : `${n} views`;
function ago(iso) {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso)) / 1000, units = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400]];
  for (const [u, sec] of units) { const n = Math.floor(s / sec); if (n >= 1) return `${n} ${u}${n > 1 ? "s" : ""} ago`; }
  return "today";
}
const laterBtn = (vid) => {
  const on = watchLater.includes(vid);
  return `<span class="later-btn ${on ? "on" : ""}" role="button" tabindex="0" data-later="${vid}"
    title="${on ? "Remove from Saved" : "Saved"}" aria-label="${on ? "Remove from Saved" : "Saved"}">${on ? CHECK : CLOCK}</span>`;
};
// YouTube provides both automatic video frames and uploader-selected cover images.
// Browsers fetch images directly; neither video nor thumbnail bytes pass through our Worker.
let useFrames = store.get("frames", true);
const frameSrc = (vid) => `https://i.ytimg.com/vi/${vid}/hq2.jpg`;
const thumbSrc = (vid) => useFrames ? frameSrc(vid) : `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
function thumbFallback(img) {
  const vid = img.dataset.vid;
  if (img.src.includes("/hq2.jpg")) img.src = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
  else img.onerror = null;
}
window.thumbFallback = thumbFallback;
const thumb = (d) => `<div class="thumb"><img loading="lazy" src="${thumbSrc(d.vid)}" data-vid="${d.vid}" width="480" height="360" onerror="thumbFallback(this)" alt="${esc("Video frame: " + d.title)}">${laterBtn(d.vid)}<span class="dur">${dur(d.duration_s)}</span></div>`;
const sub = signal;

// ---------- components ----------
const card = (d) => `<a class="vcard" href="/watch/${d.vid}"${d.reason ? ` title="${esc(d.reason)}"` : ""}>${thumb(d)}
  <div class="info"><div style="min-width:0">
    <h3 class="vt">${esc(d.title)}</h3><div class="sub">${esc(d.channel)}</div>
    <div class="sub">${sub(d)}</div></div></div></a>`;

const row = (d) => `<a class="srow" href="/watch/${d.vid}">${thumb(d)}<div style="min-width:0">
    <h3 class="vt">${esc(d.title)}</h3><div class="sub">${sub(d)}</div>
    <div class="chan">${esc(d.channel)}</div>
    <div class="snip">${esc(d.summary)}</div>
    ${d.via ? `<span class="via">Topic match · ${esc(d.via)}</span>` : ""}</div></a>`;

const next = (d) => `<a class="next" href="/watch/${d.vid}">${thumb(d)}<div style="min-width:0">
    <h3 class="vt">${esc(d.title)}</h3><div class="sub">${esc(d.channel)}</div><div class="sub">${sub(d)}</div></div></a>`;

// comment text: escape, then turn the link markers into small pills
const commentHTML = (t) => esc(t).replace(/\[VIDEO\]/g, '<span class="mk v">▶ this video</span>').replace(/\[LINK\]/g, '<span class="mk">link</span>');
const STANCE = { strong_rec: "Strongly recommends", rec: "Recommends", reference: "Cites", joke: "Joke", critical: "Critical" };



// ---------- infinite scroll ----------
let pager = null;
function infinite(container, load) {
  if (pager) pager.disconnect();
  const paginated = initialPage && /^\/(browse|c\/|a\/)/.test(location.pathname) && !filtering(filterParams()) && !filterParams().sort;
  let offset = paginated ? (initialPage.page - 1) * 36 : 0, busy = false, done = false;
  const sentinel = document.createElement("div"); sentinel.className = "sentinel";
  container.after(sentinel);
  const more = async () => {
    if (busy || done) return; busy = true;
    const items = await load(offset);
    offset += items.length; done = paginated || items.length === 0;
    container.insertAdjacentHTML("beforeend", items.map(card).join(""));
    if (!offset) container.outerHTML = `<div class="status">${filtering(filterParams()) ? "No videos match these filters." : "Nothing here yet."}</div>`;
    busy = false;
    if (!done && sentinel.getBoundingClientRect().top < innerHeight + 800) more();
  };
  pager = new IntersectionObserver((e) => e[0].isIntersecting && more(), { rootMargin: "800px" });
  if (!paginated) pager.observe(sentinel);
  if (paginated && initialPage.totalPages > 1) {
    const n=initialPage.page,total=initialPage.totalPages,p=location.pathname;
    sentinel.insertAdjacentHTML('afterend',`<nav class="pagination" aria-label="Video pages">${n>1?`<a class="pill" rel="prev" href="${p}${n>2?'?page='+(n-1):''}">Previous page</a>`:''}<span class="sub">Page ${n} of ${total}</span>${n<total?`<a class="pill" rel="next" href="${p}?page=${n+1}">Next page</a>`:''}</nav>`);
  }
  more();
}

// ---------- pages ----------
function currentSource(){const source=new URLSearchParams(location.search).get('source')||'all';return types.some(t=>t[0]===source)?source:'all';}
async function home() {
  const source=currentSource(),item=new URLSearchParams(location.search).get('item');
  if(item){const d=examples.find(x=>x.id===item&&x.kind===source);if(!d)return notFound();
    const id='example:'+d.id;markSeen(id);view.innerHTML=exampleDetail(d,watchLater.includes(id),likes.includes(id));
    $('[data-example-save]').onclick=e=>{e.currentTarget.textContent=toggleLater(id)?'Saved':'Save';};
    $('[data-example-like]').onclick=e=>{likes=likes.includes(id)?likes.filter(x=>x!==id):likes.concat(id);store.set('likes',likes);e.currentTarget.textContent=likes.includes(id)?'Liked':'Like';};return;
  }
  if(!['all','videos'].includes(source)){view.innerHTML=sourcePage(source);return;}
  const params = filterParams();
  view.innerHTML = `<h1 class="sr-only">Videos shared on Hacker News</h1>${typeChips(source)}${filterBar('/', {...params,source}, true, false)}<div class="grid" id="grid"></div>`;
  wireFilterBar();
  areasCache ??= await api('/api/browse');
  const categories=areasCache.flatMap(a=>a.categories);
  $('#filters-btn').insertAdjacentHTML('afterend',`<label class="category-select">Category <select id="category-select"><option value="">All categories</option>${categories.map(c=>`<option value="${esc(c.id)}" ${params.cat===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label>`);
  $('#category-select').onchange=e=>navigate(withParams('/',{...params,source,cat:e.target.value}));
  infinite($('#grid'), offset=>api(withParams('/api/list',{...params,offset,n:36})));
}

// one topic category, best first, with its area as a breadcrumb
async function category(id) {
  areasCache ??= await api("/api/browse");
  const a = areasCache.find(x => x.categories.some(c => c.id === id));
  if (!a) return notFound();
  const c = a.categories.find(c => c.id === id);
  if (!initialPage?.meta) document.title = `${c.name} - HackerTube`;
  const params = filterParams();
  view.innerHTML = `<div class="pagehead"><a class="crumb" href="/a/${a.id}">${esc(a.name)}</a><h1>${esc(c.name)}</h1></div>
    ${filterBar(`/c/${id}`, params, true)}<div class="grid" id="grid"></div>`;
  wireFilterBar();
  infinite($("#grid"), (offset) => api(withParams("/api/list", { cat: id, ...params, offset, n: 36 })));
}

// every video, filtered and sorted: the home page's Filters lead here (advanced search without a query)
async function browsePage() {
  if (!initialPage?.meta) document.title = (filterParams().dur === "xlong" ? "Longs" : "Browse all videos") + " - HackerTube";
  const params = filterParams();
  const longs = params.dur === "xlong";
  view.innerHTML = `<div class="pagehead"><h1>${longs ? "Longs" : "All videos"}</h1>${longs
      ? `<p class="sub">Every video over an hour. The opposite of Shorts.</p>` : ""}</div>${filterBar("/browse", params, true)}
    <div class="grid" id="grid"></div>`;
  wireFilterBar();
  infinite($("#grid"), (offset) => api(withParams("/api/list", { ...params, offset, n: 36 })));
}

let areasCache = null;
async function area(id) {
  areasCache ??= await api("/api/browse");
  const a = areasCache.find(x => x.id === id);
  if (!a) return notFound();
  const params = filterParams();
  view.innerHTML = `${`<a class="crumb" href="/categories">Categories</a>`}<div class="pagehead"><h1>${esc(a.name)}</h1></div>
    <div class="catwrap">${a.categories.map(c => `<a class="chip" href="/c/${c.id}">${esc(c.name)}</a>`).join("")}</div>
    ${filterBar(`/a/${id}`, params, true)}<div class="grid" id="grid"></div>`;
  wireFilterBar();
  infinite($("#grid"), (offset) => api(withParams("/api/list", { area: id, ...params, offset, n: 36 })));
}

const playlistCard = (p) => `<a class="plcard" href="/p/${p.slug}">
    <div class="mosaic">${p.cover.map(v => `<img loading="lazy" src="${thumbSrc(v)}" data-vid="${v}" width="480" height="360" onerror="thumbFallback(this)" alt="Playlist video frame">`).join("")}
      <span class="plcount">${p.count} videos · ${hours(p.minutes)}</span></div>
    <h3 class="vt">${esc(p.title)}</h3><p class="sub">${esc(p.pitch)}</p></a>`;

const hours = (m) => m >= 60 ? `${Math.floor(m / 60)} hr ${m % 60} min` : `${m} min`;

// one playlist: Claude's intro, then the videos in order with a note on each, and Play all on YouTube
async function playlistPage(slug) {
  let pl;
  try { pl = await api(`/api/playlist?slug=${encodeURIComponent(slug)}`); } catch { return notFound(); }
  if (!initialPage?.meta) document.title = `${pl.title} - HackerTube`;
  view.innerHTML = `<div class="plpage">
    <div class="plhead">
      <div class="mosaic">${pl.videos.slice(0, 4).map(d => `<img src="${thumbSrc(d.vid)}" data-vid="${d.vid}" width="480" height="360" onerror="thumbFallback(this)" alt="${esc("Video frame: " + d.title)}">`).join("")}</div>
      <div class="plinfo">
        <a class="crumb" href="/playlists">Playlists</a>
        <h1>${esc(pl.title)}</h1>
        <div class="sub">Curated by Claude · ${pl.videos.length} videos · ${hours(pl.minutes)}</div>
        <p class="intro">${esc(pl.intro)}</p>
        <div class="filterbar">${playAll()}</div>
      </div>
    </div>
    <ol class="plrows">${pl.videos.map((d, i) => `<li><span class="num">${i + 1}</span>
      <a class="srow" href="/watch/${d.vid}">${thumb(d)}<div style="min-width:0">
        <h3 class="vt">${esc(d.title)}</h3><div class="sub">${esc(d.channel)} · ${sub(d)}</div>
        <p class="plnote">${esc(d.note)}</p></div></a></li>`).join("")}</ol>
  </div>`;
  wirePlayAll();
}

// every topic area with its categories, plus quick ways into the whole collection
async function categoriesPage() {
  if (!initialPage?.meta) document.title = "Categories - HackerTube";
  areasCache ??= await api("/api/browse");
  view.innerHTML = `<div class="explore">
    <div class="pagehead"><h1>Categories</h1></div>
    <div class="quick">
      <a class="pill" href="/browse?sort=recent">Recently recommended</a>
      <a class="pill" href="/browse?dur=xlong">Longs</a>
      <a class="pill" href="/browse?gems=1">Hidden gems</a>
      <a class="pill" href="/browse">All videos</a>
    </div>
    <div class="areas">${areasCache.map(a => `<section class="areacard">
      <a class="areaname" href="/a/${a.id}">${esc(a.name)}<span class="count">${a.count}</span></a>
      <div class="cats">${a.categories.map(c => `<a href="/c/${c.id}">${esc(c.name)}<span class="count">${c.count}</span></a>`).join("")}</div>
    </section>`).join("")}</div>
  </div>`;
}

// the playlists curated by Claude
async function playlistsPage() {
  if (!initialPage?.meta) document.title = "Playlists - HackerTube";
  const pls = await api("/api/playlists").catch(() => []);
  view.innerHTML = `<div class="explore">
    <div class="pagehead"><h1>Playlists</h1>
      <p class="sub">Curated by Claude from what Hacker News recommends, each in a deliberate order.</p></div>
    ${!pls.length ? `<p class="sub">Coming soon.</p>` : [["start", "Start here", "Broad, essential lists for your first visit."],
        ["deep", "Deep dives", "One obsession each, for when you want to go down a rabbit hole."]]
      .map(([tier, title, blurb]) => { const ps = pls.filter(p => (p.tier || "deep") === tier);
        return ps.length ? `<h2 class="sechead">${title}</h2><p class="sub">${blurb}</p>
          <div class="pgrid">${ps.map(playlistCard).join("")}</div>` : ""; }).join("")}
  </div>`;
}

async function about() { view.innerHTML = aboutHTML; }

// a page listing saved videos, newest first
async function savedPage(title, vids, empty, extra = "") {
  const source=currentSource();
  view.innerHTML = `<div class="pagehead"><h1>${title}</h1>${extra}</div>${typeChips(source,location.pathname)}<div class="grid" id="grid"></div>`;
  const ids=vids.slice().reverse();
  const videoIds=ids.filter(id=>!id.startsWith('example:'));
  const res = ['all','videos'].includes(source)&&videoIds.length ? await api(`/api/docs?vids=${videoIds.join(',')}`) : [];
  const map=new Map(res.map(d=>[d.vid,card(d)]));
  for(const d of examples)if(source==='all'||source===d.kind)map.set('example:'+d.id,exampleCard(d));
  const cards=ids.map(id=>map.get(id)).filter(Boolean);
  $('#grid').outerHTML=cards.length?`<div class="grid">${cards.join('')}</div>`:`<div class="status">${source==='all'?empty:'No '+(types.find(t=>t[0]===source)?.[1]||'items').toLowerCase()+' here yet.'}</div>`;
}
const liked = () => savedPage("Liked", likes, "Items you like will show up here.");
const FILE_NOTES = {
  "DATA.md": "How it was made, the schema of every file, licenses",
  "videos.jsonl": "One line per video: YouTube id, title, channel, summary, why HN likes it, type, topics, categories, quote, HN stats, score",
  "mentions.jsonl": "One line per labeled HN comment: id and link, author, month, story, stance, why, quote, text",
  "taxonomy.json": "Topic areas and categories, with synonym-rich descriptions",
  "related.jsonl": "Videos recommended by the same HN people (counts only)",
  "embeddings.npy": "Search vectors: float16, 384 dims (bge-small-en-v1.5), one row per video",
  "embedding_ids.json": "Which video each embedding row is",
};
const mb = (b) => b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`;

async function dataPage() {
  if (!initialPage?.meta) document.title = "Data - HackerTube";
  view.innerHTML = `<article class="about"><h1>The data</h1><p class="lede">6,454 videos and 39,834 labeled Hacker News comments.</p><p>From HackerTube's October 31, 2026 export. Data is attributed to HackerTube and open-index/hacker-news under ODC-By 1.0.</p><p><a class="pill" href="/DATA.md" target="_blank">Read DATA.md</a> <a class="pill" href="https://hackertube.org/data" target="_blank" rel="noopener">Original data export</a></p></article>`;
}

function settings() {
  if (!initialPage?.meta) document.title = "Settings - HackerTube";
  view.innerHTML = `<div class="settings">
    <div class="pagehead"><h1>Settings</h1></div>
    <label class="setting">
      <div>
        <b>Show video frames instead of thumbnails</b>
        <p>YouTube thumbnails are designed by uploaders to grab your attention: big faces, arrows, shouting text.
          With this on, every video is shown with a frame from the middle of the video instead, so you see
          what it actually looks like. Turn it off to see the original thumbnails.</p>
      </div>
      <span class="switch"><input type="checkbox" id="frames-toggle" ${useFrames ? "checked" : ""}><span class="knob"></span></span>
    </label>
  </div>`;
  $("#frames-toggle").onchange = (e) => { useFrames = e.target.checked; store.set("frames", useFrames); };
}

const later = () => savedPage("Saved", watchLater, "Save items from their cards or detail pages.");
async function historyPage() {
  await savedPage("History", seen, "Items you open will show up here.",
    seen.length ? `<button class="pill" id="clear-history">Clear history</button>` : "");
  const btn = $("#clear-history");
  if (btn) btn.onclick = () => { seen = []; store.set("seen", seen); historyPage(); };
}

// filters, YouTube-style, on search and topic pages. Each option is one URL parameter, so filtered pages are
// shareable links. Hidden gems: recommended on HN but under 100k YouTube views. Evergreen: drops news-only videos.
const FILTERS = [
  ["First recommended", [["era","2020s","2020s"],["era","2010s","2010s"],["era","2000s","2000s"]]],
  ["Upload date", [["date", "year", "Past year"], ["date", "2020s", "2020s"], ["date", "2010s", "2010s"],
                   ["date", "2000s", "2000s"]]],
  ["Type", [["type", "talk", "Talk"], ["type", "lecture", "Lecture"], ["type", "explainer", "Explainer"],
            ["type", "tutorial", "Tutorial"], ["type", "documentary", "Documentary"], ["type", "interview", "Interview"],
            ["type", "demo", "Demo"], ["type", "commentary", "Commentary"], ["type", "comedy", "Comedy"],
            ["type", "music", "Music"]]],
  ["Duration", [["dur", "short", "Under 4 minutes"], ["dur", "medium", "4–20 minutes"], ["dur", "long", "20–60 minutes"],
                ["dur", "xlong", "Over 1 hour"]]],
  ["Features", [["gems", "1", "Hidden gems"], ["evergreen", "1", "Evergreen only"]]],
  ["Sort by", [["sort", "", "Top picks"], ["sort", "durable", "Most durable"], ["sort", "recent", "Recently recommended"], ["sort", "date", "Upload date"],
               ["sort", "old", "Oldest first"], ["sort", "views", "View count"], ["sort", "liked", "Like ratio"],
               ["sort", "hn", "Most recommended"]]],
];
const FILTER_KEYS = ["cat", ...new Set(FILTERS.flatMap(([, opts]) => opts.map(([k]) => k)))];
let filtersOpen = false;

const filterParams = () => {
  const url = new URLSearchParams(location.search);
  return Object.fromEntries(FILTER_KEYS.map((k) => [k, url.get(k) || ""]));
};
const withParams = (path, params) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
  return path + (qs ? `?${qs}` : "");
};
const filtering = (params) => FILTER_KEYS.some((k) => k !== "sort" && params[k]);

// the Filters button, chips for the active filters, and the (collapsed) panel. On topic pages there is no
// query, so the default order is "Best first" (most recommended) and that option is folded into it.
function filterBar(path, params, listing = false, playable = true) {
  // clicking an option sets it (clicking the active one clears it); the first sort option clears the sort
  const link = (k, v) => withParams(path, { ...params, [k]: params[k] === v ? "" : v });
  const groups = FILTERS.map(([title, opts]) => [title, !listing || title !== "Sort by" ? opts
    : opts.filter(([, v]) => v !== "hn").map(([k, v, label]) => [k, v, v ? label : "Top picks"])]);
  const active = groups.flatMap(([, opts]) => opts.filter(([k, v]) => v && params[k] === v)
    .map(([k, v, label]) => `<a class="chip on" href="${link(k, v)}" title="Remove filter">${label}<span>×</span></a>`));
  return `<div class="filterbar">
      <button class="pill${filtersOpen ? " on" : ""}" id="filters-btn" aria-expanded="${filtersOpen}">
        <svg viewBox="0 0 24 24"><path d="M15 17h6v1h-6v-1zm-4 0H3v1h8v2h1v-5h-1v2zm3-9h1V3h-1v2H3v1h11v2zm4-3v1h3V5h-3zM6 14h1V9H6v2H3v1h3v2zm4-2h11v-1H10v1z"/></svg>
        Filters</button>${active.join("")}<span class="grow"></span>${playable ? playAll() : ""}</div>
    <div class="filters"${filtersOpen ? "" : " hidden"}>${groups.map(([title, opts]) => `<div><h4>${title}</h4>
      ${opts.map(([k, v, label]) => `<a href="${link(k, v)}" class="${(params[k] || "") === v ? "on" : ""}">${label}</a>`).join("")}
    </div>`).join("")}</div>`;
}

// "Play all on YouTube": YouTube's watch_videos link turns up to 50 video ids into a temporary playlist that
// plays in the YouTube app too (phones, TVs), with no account or API. Uses the videos on the page, in order.
const playAll = () => `<a class="pill playall" href="https://www.youtube.com/" target="_blank" rel="noopener"
    title="Open the videos on this page as a playlist on YouTube"><svg viewBox="0 0 24 24"><path d="M3 5h12v2H3zm0 4h12v2H3zm0 4h8v2H3zm12 0v8l6-4z"/></svg>Play all on YouTube</a>`;
function wirePlayAll() {
  const a = $(".playall");
  if (!a) return;
  a.onclick = () => {
    const ids = [...new Set([...view.querySelectorAll(".thumb img[data-vid]")].map((i) => i.dataset.vid))].slice(0, 50);
    if (!ids.length) return false;
    a.href = `https://www.youtube.com/watch_videos?video_ids=${ids.join(",")}`;
  };
}

function wireFilterBar() {
  wirePlayAll();
  $("#filters-btn").onclick = () => {
    filtersOpen = !filtersOpen;
    $(".filters").hidden = !filtersOpen;
    $("#filters-btn").classList.toggle("on", filtersOpen);
    $("#filters-btn").setAttribute("aria-expanded", filtersOpen);
  };
  // choosing an option closes the panel, as on YouTube
  for (const a of view.querySelectorAll(".filters a")) a.addEventListener("click", () => { filtersOpen = false; });
}

async function search(q) {
  $("#q").value = q;
  const params = filterParams();
  view.innerHTML = `<div class="status">Searching…</div>`;
  let res;
  try { res = await api(withParams("/api/search", { q, ...params })); }
  catch (e) {
    if (e.message !== "429" && e.message !== "503") throw e;
    view.innerHTML = `<div class="status">Lots of searches right now. Give it a minute and try again.</div>`;
    return;
  }
  const source=currentSource();
  const videoResults=['all','videos'].includes(source)?res.results:[];
  view.innerHTML = `<h1 class="sr-only">Search results for ${esc(q)}</h1>${typeChips(source,location.pathname)}${filterBar(location.pathname,{...params,source})}`
    + (videoResults.length?`<section><div class="search-group-head"><h2>Videos</h2>${source==='all'?`<a class="pill" href="${location.pathname}?source=videos">See all ${videoResults.length}${videoResults.length===100?'+':''} results</a>`:''}</div><div class="${source==='all'?'grid':'results'}">${videoResults.slice(0,source==='all'?4:100).map(source==='all'?card:row).join('')}</div></section>`:`<div class="status">No ${source==='all'?'video':esc(source)} results for “${esc(q)}”.</div>`)
    + (source==='all'||source!=='videos'?`<p class="search-note sub">Books, podcasts, papers and GitHub search will be available when those collections launch. Illustrative examples are not search results.</p>`:'');

  wireFilterBar();
}

// with frames on, the watch page starts with the frame + a play button (YouTube's embed would show the
// custom thumbnail); the real player loads, autoplaying, on click
const playerHTML = (d, autoplay) => `<iframe src="https://www.youtube-nocookie.com/embed/${d.vid}?rel=0${autoplay ? "&autoplay=1" : ""}"
  title="${esc(d.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;

async function watch(vid) {
  view.innerHTML = `<div class="status">Loading…</div>`;
  let data;
  try { data = await api(`/api/video?vid=${encodeURIComponent(vid)}`); } catch { return notFound(); }
  const d = data.video, hn = d.hn;
  if (!initialPage?.meta) document.title = `${d.title} - HackerTube`;
  markSeen(d.vid);
  const recLine = hn.recommenders
    ? `${hn.recommenders} HN recommender${hn.recommenders === 1 ? "" : "s"} · recommended in ${hn.rec_months} month${hn.rec_months === 1 ? "" : "s"}, ${hn.first}–${hn.last}`
    : `Cited ${hn.mentions}× on HN, ${hn.first}–${hn.last}`;
  view.innerHTML = `<div class="watch">
    <div class="primary">
      <div class="player" id="player">${useFrames
        ? `<button class="poster" id="poster" aria-label="Play ${esc(d.title)}">
             <img src="${frameSrc(d.vid)}" data-vid="${d.vid}" width="480" height="360" onerror="thumbFallback(this)" alt="${esc("Video frame: " + d.title)}">
             <span class="play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span></button>`
        : playerHTML(d, false)}</div>
      <h1>${esc(d.title)}</h1>
      <div class="owner">
        <div class="who"><div style="min-width:0"><b>${esc(d.channel)}</b><span class="sub">${esc(recLine)}</span></div></div>
        <div class="actions">
          <div class="seg">
            <button id="like" class="${likes.includes(d.vid) ? "on" : ""}" aria-label="Like"><svg viewBox="0 0 24 24"><path d="M18.77 11h-4.23l1.52-4.94C16.38 5.03 15.54 4 14.38 4c-.58 0-1.14.24-1.52.65L7 11H3v10h14.43c1.06 0 1.98-.67 2.19-1.61l1.34-6c.27-1.24-.78-2.39-2.19-2.39zM7 20H4v-8h3v8z"/></svg><span>Like</span></button>
            <button id="dislike" class="${dislikes.includes(d.vid) ? "on" : ""}" aria-label="Dislike"><svg viewBox="0 0 24 24"><path d="M17 4h-1H6.57c-1.07 0-1.98.67-2.19 1.61l-1.34 6C2.77 12.85 3.82 14 5.23 14h4.23l-1.52 4.94C7.62 19.97 8.46 21 9.62 21c.58 0 1.14-.24 1.52-.65L17 14h4V4h-4zm-6.6 15.67c-.19.21-.48.33-.78.33-.26 0-.5-.11-.63-.3-.07-.1-.15-.26-.09-.47l1.52-4.94.4-1.29H5.23c-.41 0-.8-.17-1.03-.46-.12-.15-.25-.4-.18-.72l1.34-6c.1-.47.61-.82 1.21-.82H16v8.61l-5.6 6.06zM20 13h-3V5h3v8z"/></svg></button>
          </div>
          <button class="pill" id="save-later">${watchLater.includes(d.vid) ? CHECK + "Saved" : CLOCK + "Saved"}</button>
          <a class="pill" href="https://www.youtube.com/watch?v=${d.vid}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>YouTube</a>
        </div>
      </div>
      <div class="desc">
        <div class="top-line">${[views(d.views), ago(d.published), d.content_type, d.shelf_life, d.published ? "Uploaded " + d.published.slice(0,10) : null].filter(Boolean).map(esc).join(" · ")}</div>
        <p>${esc(d.summary)}</p>
        <p class="why">${esc(d.why_hn)}</p>
        <div class="tags">${d.categories.map(c => `<a class="tag cat" href="/c/${c.id}">${esc(c.name)}</a>`).join("")}
          ${d.tags.map(t => `<a class="tag" href="/search/${encodeURIComponent(t)}">#${esc(t.replace(/\s+/g, ""))}</a>`).join("")}</div>
      </div>
      <div class="comments"><h2>${data.comments.length} comment${data.comments.length === 1 ? "" : "s"} from Hacker News</h2>
        ${data.comments.map(m => `<div class="cmt"><div class="body" style="min-width:0">
          <div class="meta"><b>@${esc(m.author)}</b>${esc(m.ym.slice(0, 4))} · in “${esc(m.story)}”</div>
          <p>${commentHTML(m.text)}</p>
          <div class="foot"><span class="stance ${m.stance}">${STANCE[m.stance]}</span>
            <a href="https://news.ycombinator.com/item?id=${m.id}" target="_blank" rel="noopener">View on HN</a></div>
        </div></div>`).join("")}
      </div>
    </div>
    <div class="secondary" id="upnext"><div class="status">Loading…</div></div>
  </div>`;
  $("#like").onclick = () => vote(d.vid, likes, dislikes, "#like", "#dislike");
  $("#dislike").onclick = () => vote(d.vid, dislikes, likes, "#dislike", "#like");
  $("#save-later").onclick = () => { $("#save-later").innerHTML = toggleLater(d.vid) ? CHECK + "Saved" : CLOCK + "Saved"; };
  const poster = $("#poster");
  if (poster) poster.onclick = () => { $("#player").innerHTML = playerHTML(d, true); };
  const rel = await api(`/api/related?vid=${d.vid}&n=20`);
  if (location.pathname === `/watch/${d.vid}`) $("#upnext").innerHTML = rel.map(next).join("");
}

function vote(vid, list, other, me, them) {
  const i = list.indexOf(vid);
  if (i >= 0) list.splice(i, 1); else { list.push(vid); const j = other.indexOf(vid); if (j >= 0) other.splice(j, 1); }
  store.set("likes", likes); store.set("dislikes", dislikes);
  $(me).classList.toggle("on", list.includes(vid)); $(them).classList.remove("on");
}

function notFound() { view.innerHTML = `<h1>Page not found</h1><p><a href="/categories">Browse categories</a> or <a href="/">return home</a>.</p>`; }

// ---------- router ----------
// Real paths (/watch/<id>, /search/<q>, ...) so links are shareable and get link previews; the server
// returns this page for every such path. In-app navigation uses pushState, so it stays instant.
function navigate(path) { location.assign(path); }

async function route() {
  // links from before path routing looked like /#/watch/<id>: move them to the real path
  if (location.hash.startsWith("#/")) {
    history.replaceState(null, "", location.hash.slice(1));
  }
  const path = location.pathname;
  const [, page, ...rest] = path.split("/");
  const arg = decodeURIComponent(rest.join("/"));
  if (!initialPage?.meta) document.title = "HackerTube";
  document.body.classList.remove("drawer");
  selected = -1;
  for (const a of document.querySelectorAll(".side a")) {
    a.classList.toggle("on", a.getAttribute("href") === path + location.search || (path==='/' && a.dataset.nav===currentSource()));
  }
  if (page !== "search") $("#q").value = "";
  if (pager) { pager.disconnect(); pager = null; }
  try {
    if (!page) await home();
    else if (page === "c") await category(arg);
    else if (page === "categories") await categoriesPage();
    else if (page === "playlists") await playlistsPage();
    else if (page === "p") await playlistPage(arg);
    else if (page === "a") await area(arg);
    else if (page === "browse") await browsePage();
    else if (page === "watch") await watch(arg);
    else if (page === "search") await search(arg);
    else if (page === "liked") await liked();
    else if (page === "history") await historyPage();
    else if (page === "later") await later();
    else if (page === "about") await about();
    else if (page === "settings") settings();
    else if (page === "data") await dataPage();
    else if (["books","github","papers","podcasts"].includes(page)) {view.innerHTML=sourcePage(page);}

    else notFound();
  } catch (e) { view.innerHTML = `<div class="status">Something went wrong (${esc(e.message)}).</div>`; }
  const firstHeading = view.querySelector('h1');
  if (initialPage?.meta && firstHeading && !new URLSearchParams(location.search).has('source') && !filtering(filterParams()) && !location.pathname.startsWith('/search/')) firstHeading.textContent = initialPage.meta.h1;
  if (!firstHeading) view.insertAdjacentHTML('afterbegin', `<h1 class="sr-only">${esc(document.title)}</h1>`);
  window.scrollTo(0, 0);
}
addEventListener("popstate", route);
// follow same-site links without a page load (modified clicks still open new tabs as usual)
document.addEventListener("click", (e) => {
  const a = e.target instanceof Element && e.target.closest("a[href^='/']");
  if (!a || a.hasAttribute("download") || a.target || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  navigate(a.getAttribute("href"));
});

$("#search").addEventListener("submit", (e) => {
  e.preventDefault(); const q = $("#q").value.trim();
  $("#q").blur();
  // filters chosen on this page (browse, topic, search) carry over into the search
  navigate(q ? withParams(`/search/${encodeURIComponent(q)}`, filterParams()) : "/");
});
$("#menu").onclick = () => {
  if (matchMedia("(max-width: 800px)").matches) document.body.classList.toggle("drawer");
  else { document.body.classList.toggle("collapsed"); store.set("collapsed", document.body.classList.contains("collapsed")); }
};
$("#scrim").onclick = () => document.body.classList.remove("drawer");
// the thumbnail clock button sits inside a link: toggle Saved without following the link
function onLaterButton(e) {
  const b = e.target instanceof Element && e.target.closest("[data-later]");
  if (!b || (e.type === "keydown" && e.key !== "Enter" && e.key !== " ")) return;
  e.preventDefault(); e.stopPropagation();
  const on = toggleLater(b.dataset.later);
  b.outerHTML = laterBtn(b.dataset.later);
  if (!on && location.pathname === "/later") later();
}
document.addEventListener("click", onLaterButton, true);
document.addEventListener("keydown", onLaterButton, true);
$("#theme").onclick = () => {
  const dark = matchMedia("(prefers-color-scheme: dark)").matches;
  const cur = document.documentElement.dataset.theme || (dark ? "dark" : "light");
  const t = cur === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = t; store.set("theme", t);
};
if (store.get("theme")) document.documentElement.dataset.theme = store.get("theme");
if (store.get("collapsed", false)) document.body.classList.add("collapsed");

// ---------- keyboard shortcuts ----------
let selected = -1;                                         // index of the keyboard-selected video on the page
const listItems = () => [...view.querySelectorAll(".vcard, .srow, .next")];
const vidOf = (el) => el?.getAttribute("href")?.split("/").pop();
function select(i) {
  const list = listItems();
  if (!list.length) return;
  selected = Math.max(0, Math.min(i, list.length - 1));
  list.forEach((el, j) => el.classList.toggle("kbd", j === selected));
  list[selected].scrollIntoView({ block: "nearest" });
}
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.classList.add("on");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("on"), 1800);
}
function keyLike(vid) {
  const i = likes.indexOf(vid);
  if (i >= 0) likes.splice(i, 1); else { likes.push(vid); dislikes = dislikes.filter(v => v !== vid); }
  store.set("likes", likes); store.set("dislikes", dislikes);
  if (location.pathname === `/watch/${vid}`) { $("#like")?.classList.toggle("on", likes.includes(vid)); $("#dislike")?.classList.remove("on"); }
  toast(likes.includes(vid) ? "Added to Liked" : "Removed from Liked");
}
function keyLater(vid) {
  const on = toggleLater(vid);
  document.querySelectorAll(`[data-later="${vid}"]`).forEach(b => { b.outerHTML = laterBtn(vid); });
  if (location.pathname === `/watch/${vid}` && $("#save-later")) $("#save-later").innerHTML = on ? CHECK + "Saved" : CLOCK + "Saved";
  toast(on ? "Saved to Saved" : "Removed from Saved");
}
const SHORTCUTS = [["/", "Search"], ["j / k", "Next / previous video"], ["Enter", "Open the selected video"],
  ["l", "Like the selected or current video"], ["w", "Saved for the selected or current video"],
  ["p", "Play (on a video page)"], ["h", "Home"], ["?", "Show these shortcuts"], ["Esc", "Close / leave the search box"]];
function toggleHelp(force) {
  const h = $("#help");
  const show = force ?? !h.classList.contains("on");
  h.innerHTML = `<div class="help-card" role="dialog" aria-label="Keyboard shortcuts"><h3>Keyboard shortcuts</h3>
    <table>${SHORTCUTS.map(([k, d]) => `<tr><td>${k.split(" / ").map(x => `<kbd>${esc(x)}</kbd>`).join(" / ")}</td><td>${esc(d)}</td></tr>`).join("")}</table></div>`;
  h.classList.toggle("on", show);
}
$("#help").onclick = (e) => { if (e.target.id === "help") toggleHelp(false); };
document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const el = document.activeElement;
  const typing = el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);
  if (e.key === "Escape") {
    if (typing) el.blur();
    toggleHelp(false); document.body.classList.remove("drawer");
    return;
  }
  if (typing) return;
  const sel = listItems()[selected];
  const watching = location.pathname.startsWith("/watch/") ? location.pathname.split("/")[2] : null;
  const target = vidOf(sel) || watching;
  const key = e.code === "Slash" && e.shiftKey ? "?" : e.key;   // "?" by position too, for odd layouts
  switch (key) {
    case "/": e.preventDefault(); $("#q").focus(); $("#q").select(); break;
    case "j": select(selected + 1); break;
    case "k": select(selected - 1); break;
    case "Enter": if (sel) { e.preventDefault(); navigate(sel.getAttribute("href")); } break;
    case "l": if (target) keyLike(target); break;
    case "w": if (target) keyLater(target); break;
    case "p": $("#poster")?.click(); break;
    case "h": navigate("/"); break;
    case "?": toggleHelp(); break;
    default: return;
  }
});

route();
