"""One-time history backfill.
  python importers.py spotify path/to/Streaming_History_Audio_*.json ...
  python importers.py youtube path/to/watch-history.json   (Google Takeout, JSON format)
"""
import json, sys
import db

def spotify_extended(paths):
    rows = []
    for p in paths:
        for e in json.load(open(p, encoding="utf-8")):
            if not e.get("master_metadata_track_name") or e.get("ms_played", 0) < 30000:
                continue  # skip podcasts / skips (<30s)
            uri = e.get("spotify_track_uri") or ""
            rows.append(dict(
                source="spotify", track=e["master_metadata_track_name"],
                artist=e.get("master_metadata_album_artist_name") or "",
                album=e.get("master_metadata_album_album_name"),
                ref=f"https://open.spotify.com/track/{uri.split(':')[-1]}" if uri else None,
                played_at=e["ts"], approx=False))
    return db.insert_listens(rows)

def youtube_takeout(path):
    rows = []
    for e in json.load(open(path, encoding="utf-8")):
        if e.get("header") != "YouTube Music" or not e.get("title", "").startswith("Watched "):
            continue
        subs = e.get("subtitles") or [{}]
        artist = (subs[0].get("name") or "").replace(" - Topic", "")
        rows.append(dict(source="ytmusic", track=e["title"][8:], artist=artist,
                         ref=e.get("titleUrl"), played_at=e["time"].split(".")[0].rstrip("Z") + "Z",
                         approx=False))
    return db.insert_listens(rows)

if __name__ == "__main__":
    db.init()
    kind, paths = sys.argv[1], sys.argv[2:]
    print("added", spotify_extended(paths) if kind == "spotify" else youtube_takeout(paths[0]))
