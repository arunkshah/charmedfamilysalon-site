#!/usr/bin/env python3
"""Keep the Google rating and review count on the website in sync with Google.

Run daily by .github/workflows/review-count.yml. Reads the live rating and
review count for the salon's Google Business Profile from the Places API (New)
and rewrites ONLY the specific spots below where the site shows them. The
numbers stay in the static HTML so search engines and AI assistants read them
(a JavaScript widget would hide them from both).

Never adds AggregateRating structured data: the reviews live on Google Maps,
and Google does not allow marking up third-party reviews on your own site.

Usage:
  python3 scripts/update_review_count.py           # update files if Google's numbers changed
  python3 scripts/update_review_count.py --find    # print Place ID candidates (one-time setup)
  python3 scripts/update_review_count.py --dry-run # show what would change, write nothing

Env: GOOGLE_PLACES_API_KEY (required), GOOGLE_PLACE_ID (required except --find),
     MOCK_PLACES_RESPONSE (tests only: a JSON body used instead of calling Google).
"""
import json, os, re, subprocess, sys, urllib.request, urllib.error

API = "https://places.googleapis.com/v1"
NAME_MUST_CONTAIN = "charmed"

# Each pattern must contain exactly one capture group: the number to replace.
COUNT_PATTERNS = [
    r"<b>(\d+)\+ Google reviews</b>",                    # index.html trust line
    r"· (\d+)\+ Google Reviews</span>",                   # best-salon-kolkata.html
    r"<strong>(\d+)\+</strong><span>Reviews</span>",      # *-offer-garia.html stat tiles
    r"on Google from (\d+)\+ reviews",                    # llms.txt summary
    r"\d / 5 from (\d+)\+ reviews",                       # llms.txt quick facts
    r"rated \d\.\d on Google from (\d+) reviews",         # salon-sonarpur / -narendrapur
]
RATING_PATTERNS = [
    r"<strong>(\d\.\d)★</strong><span>Google rating</span>",
    r"(\d\.\d)/5 · \d+\+ Google Reviews",
    r"Rated (\d\.\d) out of 5 on Google",
    r"Google rating: (\d\.\d) / 5",
    r"rated (\d\.\d) on Google from",
    r"<span>(\d\.\d) Google Rating</span>",
    r'trust-rating-num">(\d\.\d)<',
    r'stat-num">(\d\.\d)★<',
    r"(\d\.\d)★ Google rated",
    r"with a (\d\.\d)★ rating on Google",
    r"— (\d\.\d)★ on Google",
    r"(\d\.\d)★ rated unisex salon",
]
MIN_COUNT_SPOTS = 8   # if fewer spots match, the site changed shape — stop rather than guess


def call(method, url, key, field_mask, body=None):
    mock = os.environ.get("MOCK_PLACES_RESPONSE")
    if mock:
        return json.loads(mock)
    req = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body else None,
                                 headers={"X-Goog-Api-Key": key, "X-Goog-FieldMask": field_mask,
                                          "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f"Places API error {e.code}: {e.read().decode()[:500]}")


def site_files():
    out = subprocess.check_output(["git", "ls-files", "*.html", "llms.txt"]).decode().split()
    return [f for f in out if os.path.isfile(f)]


def scan(files):
    """Return {file: text} and the counts/ratings currently on the site."""
    texts = {f: open(f, encoding="utf-8").read() for f in files}
    counts, ratings = [], []
    for t in texts.values():
        for p in COUNT_PATTERNS:
            counts += [int(m.group(1)) for m in re.finditer(p, t)]
        for p in RATING_PATTERNS:
            ratings += [m.group(1) for m in re.finditer(p, t)]
    return texts, counts, ratings


def replace_group(pattern, text, new):
    return re.sub(pattern, lambda m: m.group(0)[:m.start(1) - m.start(0)] + new + m.group(0)[m.end(1) - m.start(0):], text)


def set_output(name, value):
    path = os.environ.get("GITHUB_OUTPUT")
    if path:
        with open(path, "a") as fh:
            fh.write(f"{name}={value}\n")


def not_configured(what):
    """Before setup is finished, skip quietly in GitHub Actions instead of failing every day."""
    if os.environ.get("GITHUB_ACTIONS") == "true":
        print(f"::notice::Review-count sync not configured yet: {what} is not set. Skipping.")
        set_output("changed", "false")
        sys.exit(0)
    sys.exit(f"{what} is not set")


def main():
    args = set(sys.argv[1:])
    key = os.environ.get("GOOGLE_PLACES_API_KEY") or ("mock" if os.environ.get("MOCK_PLACES_RESPONSE") else None)
    if not key:
        not_configured("GOOGLE_PLACES_API_KEY")

    if "--find" in args:
        data = call("POST", f"{API}/places:searchText", key,
                    "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount",
                    {"textQuery": "Charmed Family Salon, Anandapally Lane, Mahamaya Tala, Garia, Kolkata 700084"})
        for p in data.get("places", []):
            print(f"{p['id']}  |  {p.get('displayName', {}).get('text')}  |  {p.get('formattedAddress')}  |  "
                  f"{p.get('rating')} from {p.get('userRatingCount')} reviews")
        return

    place_id = os.environ.get("GOOGLE_PLACE_ID") or ("mock" if os.environ.get("MOCK_PLACES_RESPONSE") else None)
    if not place_id:
        not_configured("GOOGLE_PLACE_ID (run the workflow once with find_place = true to get it)")

    data = call("GET", f"{API}/places/{place_id}", key, "displayName,rating,userRatingCount")
    name = data.get("displayName", {}).get("text", "")
    count, rating = data.get("userRatingCount"), data.get("rating")
    print(f"Google says: {name!r} rating={rating} reviews={count}")

    # ---- safety checks: on anything odd, change nothing ----
    if NAME_MUST_CONTAIN not in name.lower():
        sys.exit(f"Refusing: place name {name!r} is not Charmed — wrong GOOGLE_PLACE_ID?")
    if not isinstance(count, int) or count < 1 or not isinstance(rating, (int, float)) or not 1 <= rating <= 5:
        sys.exit(f"Refusing: implausible data rating={rating} count={count}")

    texts, site_counts, site_ratings = scan(site_files())
    if len(site_counts) < MIN_COUNT_SPOTS:
        sys.exit(f"Refusing: only {len(site_counts)} review-count spots found (expected {MIN_COUNT_SPOTS}+) — page wording changed?")
    current = max(site_counts)
    if count < current:
        print(f"Skipping: Google count {count} is lower than the site's {current} (Google sometimes removes reviews; "
              f"lower it by hand if it's permanent).")
        set_output("changed", "false")
        return
    if count > current * 2 + 100:
        sys.exit(f"Refusing: jump from {current} to {count} looks wrong")

    new_rating = f"{rating:.1f}"
    changed = {}
    for f, t in texts.items():
        new = t
        for p in COUNT_PATTERNS:
            new = replace_group(p, new, str(count))
        for p in RATING_PATTERNS:
            new = replace_group(p, new, new_rating)
        if new != t:
            changed[f] = new
    print(f"Site had: counts {sorted(set(site_counts))}, ratings {sorted(set(site_ratings))}")
    print(f"Update to: {count} reviews, rating {new_rating} -> {len(changed)} file(s): {', '.join(sorted(changed)) or 'none'}")

    if changed and "--dry-run" not in args:
        for f, new in changed.items():
            with open(f, "w", encoding="utf-8") as fh:
                fh.write(new)
    set_output("changed", "true" if changed and "--dry-run" not in args else "false")
    set_output("summary", f"{count} reviews, rating {new_rating}")


if __name__ == "__main__":
    main()
