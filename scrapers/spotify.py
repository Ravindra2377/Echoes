"""Spotify via the official Web API (recently played, last 50, exact timestamps).
Create an app at developer.spotify.com, set env vars in .env. First run opens a browser for consent.
"""
def fetch():
    import spotipy
    from spotipy.oauth2 import SpotifyOAuth
    sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
        scope="user-read-recently-played", cache_path=".spotify_cache", open_browser=True))
    rows = []
    for it in sp.current_user_recently_played(limit=50)["items"]:
        t = it["track"]
        ts = it["played_at"].replace(".000Z", "Z")
        if "." in ts:  # trim fractional seconds
            ts = ts.split(".")[0] + "Z"
        rows.append(dict(
            source="spotify", track=t["name"],
            artist=", ".join(a["name"] for a in t["artists"]),
            album=t["album"]["name"], ref=t["external_urls"].get("spotify"),
            played_at=ts, approx=False))
    return rows
