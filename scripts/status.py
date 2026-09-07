#!/usr/bin/env python3
"""Probe services and X profile, write status.json (only when changed)."""
import json
import os
import re
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "status.json")

SITES = [
    {"name": "verlintas.github.io", "url": "https://verlintas.github.io"},
    {"name": "nusv.mysxl.cn", "url": "https://nusv.mysxl.cn"},
    {"name": "usv.mysxl.cn", "url": "https://usv.mysxl.cn"},
    {"name": "elecusv.mysxl.cn", "url": "https://elecusv.mysxl.cn"},
    {"name": "nusv.github.io", "url": "https://nusv.github.io"},
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


X_API_THROTTLE_SEC = 3 * 3600  # official API checked at most every 3h


def x_last_post(old_x=None, token=None):
    """X account status: live followers via fxtwitter; last post time via
    official API v2 (throttled to fit the free tier)."""
    result = {"ok": False, "note": "unreachable"}

    ok, body = fetch_text("https://api.fxtwitter.com/Verlintas", timeout=10)
    if ok:
        try:
            u = json.loads(body)["user"]
            result = {
                "ok": True,
                "followers": u.get("followers"),
                "tweets": u.get("tweets"),
                "likes": u.get("likes"),
            }
        except Exception:
            result = {"ok": False, "note": "fxtwitter parse failed"}

    if token and result.get("ok"):
        checked = (old_x or {}).get("last_post_checked")
        if checked:
            try:
                last = datetime.strptime(checked, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
                fresh = (datetime.now(timezone.utc) - last).total_seconds() < X_API_THROTTLE_SEC
            except ValueError:
                fresh = False
        else:
            fresh = False
        if fresh:
            result["last_post"] = (old_x or {}).get("last_post")
            result["last_post_source"] = (old_x or {}).get("last_post_source") or "api"
            result["last_post_checked"] = checked
        else:
            post = api_last_post(token)
            result["last_post"] = post
            result["last_post_source"] = "api" if post else (old_x or {}).get("last_post_source")
            result["last_post_checked"] = iso(datetime.now(timezone.utc))
            if not post:
                result["last_post"] = (old_x or {}).get("last_post")

    # Free activity hint: a growing tweet counter means a new post was made
    # since the last probe (accuracy = probe interval).
    if result.get("ok") and result.get("tweets") is not None:
        prev_tweets = (old_x or {}).get("tweets")
        if prev_tweets is not None and result["tweets"] > prev_tweets:
            result["last_post"] = iso(datetime.now(timezone.utc))
            result["last_post_source"] = "counter-delta"
        elif not result.get("last_post"):
            result["last_post"] = (old_x or {}).get("last_post")
    return result


def api_last_post(token):
    """Newest tweet time via X API v2 (user-id lookup + tweets endpoint)."""
    headers = dict(HEADERS)
    headers["Authorization"] = "Bearer " + token

    def get(host, path, params=""):
        url = "https://%s%s?%s" % (host, path, params)
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=12, context=CTX) as resp:
                return json.loads(resp.read().decode("utf-8", "ignore")), None
        except urllib.error.HTTPError as e:
            return None, "HTTP %s %s" % (e.code, e.reason)
        except Exception as e:
            return None, type(e).__name__

    hosts = ["api.x.com", "api.twitter.com"]
    data = None
    err = None
    for host in hosts:
        data, err = get(host, "/2/users/by/username/Verlintas", "user.fields=id")
        if data is not None:
            break
    if data is None:
        if "402" not in (err or ""):
            print("X API user lookup failed:", err)
        return None
    user_id = ((data.get("data") or {}).get("id")) or None
    if not user_id:
        print("X API user lookup raw:", json.dumps(data)[:300])
        return None

    data2 = None
    err2 = None
    for host in hosts:
        data2, err2 = get(
            host,
            "/2/users/%s/tweets" % user_id,
            "max_results=5&tweet.fields=created_at",
        )
        if data2 is not None:
            break
    if data2 is None:
        print("X API tweets failed:", err2)
        return None
    print("X API tweets raw:", json.dumps(data2)[:300])
    tweets = (data2 or {}).get("data") or []
    if not tweets:
        return None
    times = []
    for t in tweets:
        raw = (t or {}).get("created_at", "")
        try:
            dt = datetime.strptime(raw, "%Y-%m-%dT%H:%M:%S.%fZ").replace(tzinfo=timezone.utc)
        except ValueError:
            try:
                dt = datetime.strptime(raw, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
            except ValueError:
                continue
        times.append(dt)
    if not times:
        return None
    return iso(max(times))


def main():
    old = {}
    if os.path.exists(OUT):
        try:
            with open(OUT, encoding="utf-8") as f:
                old = json.load(f)
        except Exception:
            old = {}

    sites = []
    for s in SITES:
        r = probe(s["url"])
        sites.append({"name": s["name"], "url": s["url"], **r})

    x = x_last_post(old_x=old.get("x"), token=os.environ.get("X_BEARER_TOKEN") or None)
    payload = {
        "generated": iso(datetime.now(timezone.utc)),
        "sites": sites,
        "x": x,
    }

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
