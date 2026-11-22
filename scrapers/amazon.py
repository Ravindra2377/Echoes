"""Amazon Music via Playwright + saved session. FRAGILE: selectors will need tuning.
  python -m scrapers.amazon login   # log in manually once (2FA/captcha ok), saves session
  python -m scrapers.amazon debug   # saves amazon_debug.png/.html so you can inspect the page
"""
import os, sys
from datetime import datetime, timezone

SESSION = os.getenv("AMAZON_SESSION", "amazon_session.json")
URL = os.getenv("AMAZON_URL", "https://music.amazon.in/recents")
# Amazon's web player uses <music-image-row primary-text=... secondary-text-1=...>; adjust if it changes.
JS = """els => els.map(e => ({
  t: e.getAttribute('primary-text'),
  a: e.getAttribute('secondary-text-1') || e.getAttribute('secondary-text'),
  al: e.getAttribute('secondary-text-2'),
  href: e.getAttribute('primary-href') || null }))"""
SELECTOR = os.getenv("AMAZON_SELECTOR", "music-image-row")

def _page(p, headless=True):
    b = p.chromium.launch(headless=headless)
    ctx = b.new_context(storage_state=SESSION) if os.path.exists(SESSION) else b.new_context()
    return b, ctx, ctx.new_page()

def login():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b, ctx, page = _page(p, headless=False)
        page.goto("https://music.amazon.in")
        input("Log in in the browser window, then press Enter here... ")
        ctx.storage_state(path=SESSION)
        b.close()
    print("Saved", SESSION)

def fetch(debug=False):
    from playwright.sync_api import sync_playwright
    if not os.path.exists(SESSION):
        raise RuntimeError("No Amazon session. Run: python -m scrapers.amazon login")
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with sync_playwright() as p:
        b, ctx, page = _page(p)
        page.goto(URL, wait_until="networkidle")
        try:
            page.wait_for_selector(SELECTOR, timeout=15000)
        except Exception:
            pass
        if debug:
            page.screenshot(path="amazon_debug.png", full_page=True)
            open("amazon_debug.html", "w").write(page.content())
        items = page.eval_on_selector_all(SELECTOR, JS)
        ctx.storage_state(path=SESSION)  # refresh cookies
        b.close()
    if not items and "signin" in page.url:
        raise RuntimeError("Amazon session expired; re-run login")
    return [dict(source="amazon", track=i["t"], artist=i["a"] or "", album=i["al"],
                 ref=i["href"], played_at=now, approx=True) for i in items if i.get("t")]

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "login": login()
    elif cmd == "debug": print(len(fetch(debug=True)), "items")
    else: print("usage: login | debug")
