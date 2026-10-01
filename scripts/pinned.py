"""Sync the projects grid in index.html with the GitHub pinned repositories.

Fetches the profile's pinned repos (GraphQL, needs GITHUB_TOKEN) and regenerates
the card markup between the pinned:start / pinned:end markers in index.html.
Curated copy lives in CURATED below; unknown repos fall back to GitHub metadata.
Best-effort: on any failure it leaves index.html untouched and exits 0.
"""
import html
import json
import os
import re
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
INDEX = os.path.join(HERE, "..", "index.html")

START_MARKER = "<!-- pinned:start"
END_MARKER = "<!-- pinned:end -->"

QUERY = """
{
  user(login: "Verlintas") {
    pinnedItems(first: 6, types: [REPOSITORY]) {
      nodes {
        ... on Repository {
          name
          owner { login }
          url
          description
          homepageUrl
          primaryLanguage { name }
        }
      }
    }
  }
}
"""

# Curated card copy per repo. tag: the small red label; chips: the meta row.
CURATED = {
    "Verlintas/BetterAIChat": {
        "tag": "AI",
        "desc": "Native Android AI agent — your own API keys, opencode-style modes, device tools, Shizuku shell, screen analysis, voice assistant.",
        "chips": ["Kotlin", "AI", "Android"],
    },
    "Verlintas/VicinityProbe": {
        "tag": "probe",
        "desc": "Professional environment measurement & security toolkit — 96 probes, sensor fusion, packet capture (JA3), NFC testing, 15+ diagnostics.",
        "chips": ["Kotlin", "Security", "Compose"],
    },
    "Verlintas/OpenVisum": {
        "tag": "播放器",
        "desc": "OpenVisum — an open-source Android video player powered by libVLC: plays virtually any format, automatic audio-track and subtitle detection, 9 theme colors.",
        "chips": ["Kotlin", "Compose", "libVLC"],
    },
    "Verlintas/NovaBAIC": {
        "tag": "AI",
        "desc": "BetterAIChat2 — a local-first Android AI agent with real device control: streaming chat, agents, 48 device tools (OCR, UI automation, files, web), long-term memory, MCP.",
        "chips": ["Kotlin", "AI", "MCP"],
    },
    "NUSV/Syna-NUSV": {
        "tag": "E2EE",
        "desc": "Syna — offline-first LAN messenger: end-to-end encryption, burn-after-reading, group chat, self-hosting, with an anti-tamper shield.",
        "chips": ["Kotlin", "KMP", "E2EE"],
    },
    "NUSV/Gomoku-NUSV": {
        "tag": "game",
        "desc": "Cross-platform Gomoku — Kotlin Multiplatform on Android, iOS, Windows and Linux, with a minimax-pruned AI.",
        "chips": ["Kotlin", "KMP", "Game AI"],
    },
}


def normalize_home(url):
    url = (url or "").strip()
    if not url:
        return None
    if not re.match(r"^https?://", url):
        url = "https://" + url
    return url


def fetch_pinned(token):
    req = urllib.request.Request(
        "https://api.github.com/graphql",
        data=json.dumps({"query": QUERY}).encode("utf-8"),
        headers={
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json",
            "User-Agent": "pinned-sync",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read().decode("utf-8", "ignore"))
    if data.get("errors"):
        raise RuntimeError("graphql: %s" % data["errors"][0].get("message", "error"))
    nodes = (((data.get("data") or {}).get("user") or {}).get("pinnedItems") or {}).get("nodes") or []
    repos = []
    for node in nodes:
        if not node or not node.get("name"):
            continue
        owner = ((node.get("owner") or {}).get("login")) or ""
        full = owner + "/" + node["name"]
        repos.append({
            "full": full,
            "name": node["name"],
            "url": node.get("url") or ("https://github.com/" + full),
            "desc": (node.get("description") or "").strip(),
            "home": normalize_home(node.get("homepageUrl")),
            "lang": ((node.get("primaryLanguage") or {}).get("name")) or "",
        })
    return repos


def render_card(repo):
    info = CURATED.get(repo["full"], {})
    name = html.escape(repo["name"])
    desc = html.escape(info.get("desc") or repo["desc"])
    tag = html.escape(info.get("tag") or repo["lang"] or "repo")
    chips = info.get("chips") or ([repo["lang"]] if repo["lang"] else [])
    chip_html = "".join('<span class="chip">%s</span>' % html.escape(c) for c in chips)
    clone = "$ git clone https://github.com/%s.git" % repo["full"]
    if repo["home"]:
        return (
            '        <div class="proj-card reveal">\n'
            '          <div class="proj-top">\n'
            '            <a class="proj-name proj-main" href="%s" target="_blank" rel="noopener">%s</a>\n'
            '            <span class="proj-star">%s</span>\n'
            '          </div>\n'
            '          <p class="proj-desc">%s</p>\n'
            '          <div class="proj-meta">%s<a class="chip chip-site" href="%s" target="_blank" rel="noopener" title="project website">官网 ↗</a></div>\n'
            '          <span class="clone-line" data-repo="%s" title="click to copy">%s</span>\n'
            '        </div>'
            % (repo["url"], name, tag, desc, chip_html, html.escape(repo["home"], quote=True), repo["full"], clone)
        )
    return (
        '        <a class="proj-card reveal" href="%s" target="_blank" rel="noopener">\n'
        '          <div class="proj-top"><span class="proj-name">%s</span><span class="proj-star">%s</span></div>\n'
        '          <p class="proj-desc">%s</p>\n'
        '          <div class="proj-meta">%s</div>\n'
        '          <span class="clone-line" data-repo="%s" title="click to copy">%s</span>\n'
        '        </a>'
        % (repo["url"], name, tag, desc, chip_html, repo["full"], clone)
    )


def main():
    token = os.environ.get("GITHUB_TOKEN") or ""
    if not token:
        print("GITHUB_TOKEN missing — leaving index.html untouched")
        return
    try:
        repos = fetch_pinned(token)
    except Exception as e:
        print("pinned fetch failed: %s — leaving index.html untouched" % type(e).__name__)
        return
    if not repos:
        print("no pinned repos — leaving index.html untouched")
        return

    with open(INDEX, encoding="utf-8") as f:
        page = f.read()

    pattern = re.compile(re.escape(START_MARKER) + r".*?" + re.escape(END_MARKER), re.S)
    if not pattern.search(page):
        print("markers not found — leaving index.html untouched")
        return

    cards = "\n\n".join(render_card(repo) for repo in repos)
    block = (
        "<!-- pinned:start — generated from GitHub pinned repos; edit scripts/pinned.py instead -->\n"
        + cards
        + "\n        " + END_MARKER
    )
    updated = pattern.sub(lambda m: block, page, count=1)
    if updated == page:
        print("no change")
        return
    with open(INDEX, "w", encoding="utf-8") as f:
        f.write(updated)
    print("index.html updated — %d pinned repos: %s" % (len(repos), ", ".join(r["full"] for r in repos)))


if __name__ == "__main__":
    main()
