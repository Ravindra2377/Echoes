import os, sqlite3
from datetime import datetime, timezone

DB_PATH = os.getenv("DIARY_DB", "diary.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS listens (
  id INTEGER PRIMARY KEY,
  source TEXT NOT NULL,
  track TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT '',
  album TEXT,
  ref TEXT,                       -- link / uri to open the track
  played_at TEXT NOT NULL,        -- ISO-8601 UTC
  approx INTEGER NOT NULL DEFAULT 0,  -- 1 = source gave no exact time
  dur INTEGER,                    -- duration in seconds
  UNIQUE(source, track, artist, played_at)
);
CREATE INDEX IF NOT EXISTS idx_listens_played ON listens(played_at);
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY,
  day TEXT NOT NULL,              -- YYYY-MM-DD (local)
  listen_id INTEGER REFERENCES listens(id) ON DELETE SET NULL,
  mood TEXT,
  text TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notes_day ON notes(day);
CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY,
  source TEXT, started_at TEXT, added INTEGER, error TEXT
);
CREATE TABLE IF NOT EXISTS day_titles (
  day TEXT PRIMARY KEY,           -- YYYY-MM-DD (local)
  title TEXT NOT NULL
);
"""

def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def conn():
    c = sqlite3.connect(DB_PATH, check_same_thread=False)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA foreign_keys=ON")
    return c

def init():
    with conn() as c:
        c.executescript(SCHEMA)
        # Migration: ensure dur column exists if table was created previously
        cols = [col[1] for col in c.execute("PRAGMA table_info(listens)").fetchall()]
        if "dur" not in cols:
            c.execute("ALTER TABLE listens ADD COLUMN dur INTEGER")

def insert_listens(rows):
    """rows: dicts with source, track, artist, album, ref, played_at, approx, dur. Returns count added."""
    added = 0
    with conn() as c:
        for r in rows:
            if not r.get("track"):
                continue
            artist = r.get("artist") or ""
            if r.get("approx"):
                # no exact time: allow one entry per track per day, so repeated syncs don't duplicate
                dup = c.execute(
                    "SELECT 1 FROM listens WHERE source=? AND track=? AND artist=? AND approx=1 "
                    "AND date(played_at)=date(?)",
                    (r["source"], r["track"], artist, r["played_at"]),
                ).fetchone()
                if dup:
                    continue
            cur = c.execute(
                "INSERT OR IGNORE INTO listens(source,track,artist,album,ref,played_at,approx,dur) "
                "VALUES (?,?,?,?,?,?,?,?)",
                (r["source"], r["track"], artist, r.get("album"), r.get("ref"),
                 r["played_at"], 1 if r.get("approx") else 0, r.get("dur")),
            )
            added += cur.rowcount
    return added
