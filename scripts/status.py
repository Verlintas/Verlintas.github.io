#!/usr/bin/env python3
"""Probe services and X profile, write status.json (only when changed)."""
import json
import os
import re
import ssl
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "status.json")

SITES = [
    {"name": "verlintas.github.io", "url": "https://verlintas.github.io"},
    {"name": "nusv.mysxl.cn", "url": "https://nusv.mysxl.cn"},
    {"name": "usv.mysxl.cn", "url": "https://usv.mysxl.cn"},
    {"name": "elecusv.mysxl.cn", "url": "https://elecusv.mysxl.cn"},
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
}
CTX = ssl.create_default_context()
CTX.check_hostname = True


def probe(url, timeout=8):
    t0 = time.time()
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=timeout, context=CTX) as resp:
            return {
                "up": resp.status < 500,
                "ms": int((time.time() - t0) * 1000),
                "status": resp.status,
            }
    except urllib.error.HTTPError as e:
        return {"up": e.code < 500, "ms": int((time.time() - t0) * 1000), "status": e.code}
    except Exception:
        return {"up": False, "ms": None, "status": None}


def iso(dt):
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def fetch_text(url, timeout=12):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=timeout, context=CTX) as resp:
            return True, resp.read().decode("utf-8", "ignore")
    except urllib.error.HTTPError as e:
        return False, "HTTPError:%s" % e.code
    except Exception as e:
        return False, type(e).__name__


def x_last_post():
    """Best-effort: newest tweet time from profile page or mirror RSS."""
    routes = [
        ("x.com", "https://x.com/Verlintas", "html"),
        ("xcancel.com", "https://xcancel.com/Verlintas/rss", "rss"),
        ("nitter.poast.org", "https://nitter.poast.org/Verlintas/rss", "rss"),
        ("nitter.privacyredirect.com", "https://nitter.privacyredirect.com/Verlintas/rss", "rss"),
    ]
    for source, url, kind in routes:
        ok, body = fetch_text(url)
        if not ok:
            continue
        if kind == "html":
            stamps = []
            for raw in re.findall(r'"created_at":\s*"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)"', body):
                try:
                    dt = datetime.fromisoformat(raw.rstrip("Z").split(".")[0]).replace(tzinfo=timezone.utc)
                except ValueError:
                    continue
                if datetime.now(timezone.utc) > dt > datetime(2025, 1, 1, tzinfo=timezone.utc):
                    stamps.append(dt)
            if not stamps:
                continue
            return {"ok": True, "last_post": iso(max(stamps)), "source": source}
        if kind == "rss":
            m = re.search(
                r"<pubDate>([^<]+)</pubDate>", body, re.I
            )
            if not m:
                continue
            try:
                dt = datetime.strptime(m.group(1), "%a, %d %b %Y %H:%M:%S %z")
            except ValueError:
                continue
            if datetime.now(timezone.utc) > dt > datetime(2025, 1, 1, tzinfo=timezone.utc):
                return {"ok": True, "last_post": iso(dt), "source": source}
    return {"ok": False, "last_post": None, "note": "all sources failed"}


def main():
    sites = []
    for s in SITES:
        r = probe(s["url"])
        sites.append({"name": s["name"], "url": s["url"], **r})

    x = x_last_post()
    payload = {
        "generated": iso(datetime.now(timezone.utc)),
        "sites": sites,
        "x": x,
    }

    old = {}
    if os.path.exists(OUT):
        try:
            with open(OUT, encoding="utf-8") as f:
                old = json.load(f)
        except Exception:
            old = {}

    def key(d):
        s = json.loads(json.dumps(d.get("sites") or [], default=str))
        for item in s:
            item.pop("ms", None)
        return json.dumps({"sites": s, "x": d.get("x")}, sort_keys=True, default=str)

    if key(old) == key(payload):
        print("no change")
        return
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("status.json updated")


if __name__ == "__main__":
    main()
