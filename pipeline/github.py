"""Link extraction only: no network requests or recommendation inference."""
import html
import re
from urllib.parse import urlsplit

VERSION = "github-links-v1"
RESERVED = set("about account apps blog collections contact customer-stories enterprise events explore features gist issues join login logout marketplace new notifications orgs organizations pricing pull pulls readme search security sessions settings site solutions sponsors stars topics trending users".split())
URL = re.compile(r"https?://(?:www\.)?github\.com/[^\s<>\"']+", re.I)


def normalize(url):
    parsed = urlsplit(html.unescape(url))
    if parsed.scheme not in ("http", "https") or parsed.netloc.lower() not in ("github.com", "www.github.com"):
        return None
    parts = parsed.path.strip("/").split("/")
    if len(parts) < 2:
        return None
    owner, repo = parts[:2]
    repo = repo.removesuffix(".git")
    if owner.lower() in RESERVED or not re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})", owner):
        return None
    if not re.fullmatch(r"[A-Za-z0-9_.-]+", repo) or repo in (".", ".."):
        return None
    return f"{owner}/{repo}".lower()


def extract(text):
    """Retain evidence URLs; consolidate aliases before counting users.

    Issue/PR links remain candidates, never automatically endorsements.
    Numeric repository ID resolution is a later step.
    """
    found = {}
    for match in URL.finditer(html.unescape(text or "")):
        raw = match.group().rstrip(".,;:!?)]}")
        name = normalize(raw)
        if name:
            found.setdefault(name, [])
            if raw not in found[name]:
                found[name].append(raw)
    return found
