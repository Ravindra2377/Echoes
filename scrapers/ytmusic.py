"""YouTube Music via ytmusicapi (reuses your logged-in browser headers; no password stored).
Setup once:  ytmusicapi browser   -> paste request headers -> creates browser.json
"""
import os
from datetime import datetime, timedelta, timezone

def _resolve(label, now):
    # history gives only labels like "Today", "Yesterday", "Last week", "March 2026"
    label = (label or "").strip().lower()
    if label in ("", "today"):
        return now
    if label == "yesterday":
        return now - timedelta(days=1)
    for fmt in ("%B %Y", "%b %Y"):
        try:
            return datetime.strptime(label.title(), fmt).replace(tzinfo=timezone.utc, day=15, hour=12)
        except ValueError:
            pass
    if label in ("last week", "this week"):
        return now - timedelta(days=7)
    return now

def fetch():
    from ytmusicapi import YTMusic
    yt = YTMusic(os.getenv("YTM_AUTH", "browser.json"))
    now = datetime.now(timezone.utc)
    rows = []
    for it in yt.get_history():
        vid = it.get("videoId")
        rows.append(dict(
            source="ytmusic",
            track=it.get("title"),
            artist=", ".join(a["name"] for a in (it.get("artists") or []) if a.get("name")),
            album=(it.get("album") or {}).get("name"),
            ref=f"https://music.youtube.com/watch?v={vid}" if vid else None,
            played_at=_resolve(it.get("played"), now).strftime("%Y-%m-%dT%H:%M:%SZ"),
            approx=True,
        ))
    return rows
