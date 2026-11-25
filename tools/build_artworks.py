#!/usr/bin/env python3
"""Build data/artworks.json: public-domain landscape paintings large enough for a 5K screen, from the Art Institute
of Chicago (aic), the Cleveland Museum of Art (cma) and the National Gallery of Art (nga, open-data CSV files).
Each painting gets a country ("c"), a brightness grid ("l") and its aspect ratio ("r"). Needs Pillow.
Run: python3 tools/build_artworks.py
"""
import collections
import concurrent.futures
import csv
import io
import json
import pathlib
import re
import time
import urllib.error
import urllib.parse
import urllib.request

from PIL import Image

OUT = pathlib.Path(__file__).resolve().parent.parent / "data" / "artworks.json"
UA = "ArtVerse-build (+https://github.com/zhenweiding-dev/art-verse)"
MIN_RATIO, MAX_RATIO = 1.2, 2.4  # landscape, but no long handscrolls: past 2.4 a cropped strip gets blown up
MIN_WIDTH = 2500
IMAGE_WIDTH = 3000  # requested from IIIF; AIC refuses 2400-2800 but serves 3000
GRID_W, GRID_H = 12, 8  # brightness grid, one hex digit per cell; same as newtab.js
# Not paintings, or not suitable for a new tab: manuscript pages, photos of objects, album covers, erotica.
EXCLUDE = re.compile(
    r"\bfolio\b|^text\b|\bpage from\b|\bleaf from\b|\((recto|verso)\)|qur'an"
    r"|\bmanuscript\b|\bcovers?\b|\bbox\b|^album of(?!.*\bleaf\b)|erotic",
    re.I,
)
# Country of the painter's school or culture, from the museums' own fields. The earliest keyword in a value wins
# ("Spain or Northern Italy" is Spain); anything else is OTHER. Codes match COUNTRY_GROUPS in newtab.js.
COUNTRY_WORDS = {
    "US": ["united states", "american", "new york", "philadelphia", "pennsylvania", "virginia", "newport", "boston"],
    "FR": ["france", "french"],
    "IT": ["ital", "venic", "venetian", "florentine", "sienese", "bolognese", "ferrarese", "umbrian", "milanese",
           "parmese", "genoese", "neapolitan", "emilian", "brescian", "roman"],
    "NL": ["netherland", "holland", "dutch", "haarlem"],
    "FL": ["flanders", "flemish", "antwerp", "belgi"],
    "GB": ["england", "english", "british", "united kingdom", "scottish"],
    "ES": ["spain", "spanish"],
    "DE": ["german", "rhine", "cologne"],
    "AT": ["austria"],
    "JP": ["japan"],
    "CN": ["china", "chinese"],
    "KR": ["korea"],
    "IN": ["india", "murshidabad", "rajasthan"],
}
unmatched = collections.Counter()


def country(*values):
    for v in values:
        hits = [(v.lower().find(w), code) for code, words in COUNTRY_WORDS.items() for w in words if w in v.lower()]
        if hits:
            return min(hits)[1]
    unmatched[" / ".join(v for v in values if v) or "(none)"] += 1
    return "OTHER"


def get_json(url, body=None):
    headers = {"User-Agent": UA}
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    for attempt in range(3):  # the Cleveland API sometimes stalls for a minute
        try:
            with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=headers), timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError:
            raise
        except (TimeoutError, urllib.error.URLError):
            if attempt == 2:
                raise
            time.sleep(2)


def aic():
    # The search API refuses offsets past 1000 results, so the query is split by start year.
    out = {}
    for lo, hi in [(-5000, 1599), (1600, 1799), (1800, 1859), (1860, 1889), (1890, 1909), (1910, 3000)]:
        page = 1
        while True:
            d = get_json("https://api.artic.edu/api/v1/artworks/search", {
                "query": {"bool": {"must": [
                    {"term": {"is_public_domain": True}},
                    {"term": {"artwork_type_title.keyword": "Painting"}},
                    {"exists": {"field": "image_id"}},
                    {"range": {"date_start": {"gte": lo, "lte": hi}}},
                ]}},
                "limit": 100, "page": page,
                "fields": ["id", "title", "artist_title", "artist_display", "date_display", "image_id", "thumbnail",
                           "place_of_origin"],
            })
            if d["pagination"]["total"] > 1000:
                raise SystemExit(f"AIC {lo}-{hi} has {d['pagination']['total']} results; split the range further")
            for a in d["data"]:
                th = a.get("thumbnail") or {}
                w, h = th.get("width"), th.get("height")
                if not w or not h or not MIN_RATIO <= w / h <= MAX_RATIO or w < IMAGE_WIDTH or EXCLUDE.search(a["title"]):
                    continue
                # "(American, 1856–1925)" in artist_display; place_of_origin is sometimes where it was painted.
                nationality = re.search(r"\(([A-Z][A-Za-z\- ]+?)(?:,[^)]*)?\)", a.get("artist_display") or "")
                iiif = f"https://www.artic.edu/iiif/2/{a['image_id']}/full"
                out[a["id"]] = {
                    "s": "aic", "t": a["title"], "a": a.get("artist_title") or "", "d": a.get("date_display") or "",
                    "i": f"{iiif}/{IMAGE_WIDTH},/0/default.jpg", "u": f"https://www.artic.edu/artworks/{a['id']}",
                    "c": country(nationality.group(1) if nationality else "", a.get("place_of_origin") or ""),
                    "_small": f"{iiif}/200,/0/default.jpg",
                }
            if page >= d["pagination"]["total_pages"]:
                break
            page += 1
    return list(out.values())


def cma():
    out, skip = [], 0
    while True:
        q = urllib.parse.urlencode({
            "type": "Painting", "cc0": 1, "has_image": 1, "limit": 1000, "skip": skip,
            "fields": "id,title,creators,creation_date,images,url,culture",
        })
        d = get_json(f"https://openaccess-api.clevelandart.org/api/artworks/?{q}")
        for a in d["data"]:
            images = a.get("images") or {}
            p = images.get("print") or {}
            try:
                w, h = int(p["width"]), int(p["height"])
            except (KeyError, TypeError, ValueError):
                continue
            if not MIN_RATIO <= w / h <= MAX_RATIO or w < MIN_WIDTH or EXCLUDE.search(a["title"]):
                continue
            creators = a.get("creators") or []
            out.append({
                "s": "cma", "t": a["title"], "a": creators[0]["description"] if creators else "",
                "d": a.get("creation_date") or "", "i": p["url"],
                "u": a.get("url") or f"https://www.clevelandart.org/art/{a['id']}",
                "c": country(str((a.get("culture") or [""])[0])),
                "_small": (images.get("web") or {}).get("url") or p["url"],  # 900 px, the smallest CMA has
            })
        skip += 1000
        if skip >= d["info"]["total"]:
            break
    return out


def open_csv(name):
    url = f"https://raw.githubusercontent.com/NationalGalleryOfArt/opendata/main/data/{name}"
    r = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=300)
    return csv.DictReader(io.TextIOWrapper(r, encoding="utf-8", newline=""))


def nga():
    csv.field_size_limit(1 << 30)
    images = {r["depictstmsobjectid"]: (r["iiifurl"], int(r["width"]), int(r["height"]))
              for r in open_csv("published_images.csv")
              if r["viewtype"] == "primary" and r["openaccess"] == "1" and r["width"] and r["height"]}
    out = {}
    for r in open_csv("objects.csv"):
        if r["classification"] != "Painting" or r["objectid"] not in images:
            continue
        iiif, w, h = images[r["objectid"]]
        if not MIN_RATIO <= w / h <= MAX_RATIO or w < MIN_WIDTH or EXCLUDE.search(r["title"]):
            continue
        out[r["objectid"]] = {
            "s": "nga", "t": r["title"], "a": r["attribution"] or "", "d": r["displaydate"] or "",
            "i": f"{iiif}/full/{min(w, IMAGE_WIDTH)},/0/default.jpg",
            "u": f"https://www.nga.gov/collection/art-object-page.{r['objectid']}.html",
            "_small": f"{iiif}/full/200,/0/default.jpg",
        }
    schools = collections.defaultdict(list)  # "American", "Venetian", ...
    for r in open_csv("objects_terms.csv"):
        if r["termtype"] == "School" and r["objectid"] in out and r["term"] != "Unknown":
            schools[r["objectid"]].append(r["term"])
    for oid, x in out.items():
        x["c"] = country(*schools[oid])
    return list(out.values())


def brightness(url):
    """(grid, aspect ratio) of one painting from a small copy, or None if it cannot be read."""
    for _ in range(2):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": f"Mozilla/5.0 ({UA})"})
            with urllib.request.urlopen(req, timeout=60) as r:
                im = Image.open(io.BytesIO(r.read()))
                im.load()
            cells = im.convert("L").resize((GRID_W, GRID_H), Image.BOX).tobytes()
            return "".join("0123456789abcdef"[v // 16] for v in cells), round(im.width / im.height, 3)
        except Exception:  # noqa: BLE001 - no grid just means light text for this painting
            pass
    return None


def main():
    chosen = list({x["i"]: x for x in aic() + cma() + nga()}.values())  # one entry per image
    try:  # grids from the previous build are reused, so only new paintings are downloaded
        previous = {x["i"]: (x["l"], x["r"]) for x in json.loads(OUT.read_text()) if "l" in x}
    except (OSError, ValueError, KeyError):
        previous = {}
    todo = [x for x in chosen if x["i"] not in previous]
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        fresh = dict(zip((x["i"] for x in todo), pool.map(brightness, [x["_small"] for x in todo])))
    for x in chosen:
        g = previous.get(x["i"]) or fresh.get(x["i"])
        if g:
            x["l"], x["r"] = g
    kept = [{k: v for k, v in x.items() if not k.startswith("_")} for x in chosen]
    OUT.write_text(json.dumps(kept, ensure_ascii=False, separators=(",", ":")))
    by = lambda key: dict(collections.Counter(x[key] for x in kept).most_common())  # noqa: E731
    print(f"{len(kept)} paintings -> {OUT} ({OUT.stat().st_size // 1024} KB); grids: {len(chosen) - len(todo)} reused,"
          f" {len(todo)} downloaded, {sum('l' not in x for x in kept)} missing")
    print("museums:", by("s"))
    print("countries:", by("c"))
    print("OTHER from:", dict(unmatched.most_common()))


if __name__ == "__main__":
    main()
