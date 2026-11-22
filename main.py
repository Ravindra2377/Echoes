import os
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles
from datetime import date, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
import urllib.request, urllib.parse, json
import db, sync

LOCAL = "date(played_at,'localtime')"

@asynccontextmanager
async def lifespan(app):
    db.init()
    sched = BackgroundScheduler()
    mins = int(os.getenv("SYNC_INTERVAL_MIN", "45"))
    if mins > 0:
        sched.add_job(sync.run_sync, "interval", minutes=mins, max_instances=1)
        sched.start()
    yield
    if sched.running:
        sched.shutdown(wait=False)

app = FastAPI(title="Music Diary", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000", "http://localhost:5173"],
                   allow_methods=["*"], allow_headers=["*"])

def rows(sql, args=()):
    with db.conn() as c:
        return [dict(r) for r in c.execute(sql, args).fetchall()]

# ---------- timeline ----------
@app.get("/api/timeline")
def timeline(start: Optional[str] = None, end: Optional[str] = None,
             source: Optional[str] = None, limit: int = Query(60, le=366)):
    """Per-day summary: listen count, top artist, mood(s) noted."""
    where, args = ["1=1"], []
    if start: where.append(f"{LOCAL} >= ?"); args.append(start)
    if end: where.append(f"{LOCAL} <= ?"); args.append(end)
    if source: where.append("source = ?"); args.append(source)
    days = rows(f"""SELECT {LOCAL} AS day, COUNT(*) AS listens,
        SUM(COALESCE(dur, 210)) AS total_secs,
        GROUP_CONCAT(DISTINCT source) AS sources,
        (SELECT artist FROM listens l2 WHERE date(l2.played_at,'localtime')={LOCAL.replace('played_at','listens.played_at')}
         GROUP BY artist ORDER BY COUNT(*) DESC LIMIT 1) AS top_artist
        FROM listens WHERE {' AND '.join(where)} GROUP BY day ORDER BY day DESC LIMIT ?""", (*args, limit))
    for d in days:
        d["moods"] = [r["mood"] for r in rows(
            "SELECT DISTINCT mood FROM notes WHERE day=? AND mood IS NOT NULL AND mood!=''", (d["day"],))]
    return days

@app.get("/api/days/{day}")
def day(day: str):
    listens = rows(f"""SELECT id, source, track, artist, album, ref, played_at, approx, dur
                       FROM listens WHERE {LOCAL}=? ORDER BY played_at""", (day,))
    notes = rows("SELECT * FROM notes WHERE day=? ORDER BY created_at", (day,))
    return {"day": day, "listens": listens, "notes": notes}

@app.get("/api/on-this-day")
def on_this_day(date: Optional[str] = None):
    """Same month/day in earlier years."""
    md = (date or rows("SELECT date('now','localtime') d")[0]["d"])[5:]
    return rows(f"""SELECT {LOCAL} AS day, track, artist, source, COUNT(*) AS plays
        FROM listens WHERE strftime('%m-%d', played_at,'localtime')=?
        AND strftime('%Y', played_at,'localtime') < strftime('%Y','now','localtime')
        GROUP BY day, track, artist ORDER BY day DESC, plays DESC LIMIT 100""", (md,))

@app.get("/api/search")
def search(q: str, limit: int = 50):
    like = f"%{q}%"
    return rows("SELECT * FROM listens WHERE track LIKE ? OR artist LIKE ? OR album LIKE ? "
                "ORDER BY played_at DESC LIMIT ?", (like, like, like, limit))

# ---------- notes ----------
class NoteIn(BaseModel):
    day: str
    listen_id: Optional[int] = None
    mood: Optional[str] = None
    text: Optional[str] = None

class NotePatch(BaseModel):
    mood: Optional[str] = None
    text: Optional[str] = None

@app.post("/api/notes", status_code=201)
def add_note(n: NoteIn):
    with db.conn() as c:
        cur = c.execute("INSERT INTO notes(day,listen_id,mood,text,created_at) VALUES (?,?,?,?,?)",
                        (n.day, n.listen_id, n.mood, n.text, db.now_iso()))
        return dict(c.execute("SELECT * FROM notes WHERE id=?", (cur.lastrowid,)).fetchone())

@app.patch("/api/notes/{nid}")
def edit_note(nid: int, p: NotePatch):
    with db.conn() as c:
        if not c.execute("SELECT 1 FROM notes WHERE id=?", (nid,)).fetchone():
            raise HTTPException(404, "note not found")
        for f, v in p.model_dump(exclude_unset=True).items():
            c.execute(f"UPDATE notes SET {f}=? WHERE id=?", (v, nid))
        return dict(c.execute("SELECT * FROM notes WHERE id=?", (nid,)).fetchone())

@app.delete("/api/notes/{nid}", status_code=204)
def del_note(nid: int):
    with db.conn() as c:
        c.execute("DELETE FROM notes WHERE id=?", (nid,))

# ---------- stats ----------
@app.get("/api/stats")
def stats(start: Optional[str] = None, end: Optional[str] = None):
    w, a = ["1=1"], []
    if start: w.append(f"{LOCAL}>=?"); a.append(start)
    if end: w.append(f"{LOCAL}<=?"); a.append(end)
    cond = " AND ".join(w)
    return {
        "total": rows(f"SELECT COUNT(*) n FROM listens WHERE {cond}", a)[0]["n"],
        "top_artists": rows(f"SELECT artist, COUNT(*) plays FROM listens WHERE {cond} AND artist!='' "
                            "GROUP BY artist ORDER BY plays DESC LIMIT 10", a),
        "top_tracks": rows(f"SELECT track, artist, COUNT(*) plays FROM listens WHERE {cond} "
                           "GROUP BY track, artist ORDER BY plays DESC LIMIT 10", a),
        "by_source": rows(f"SELECT source, COUNT(*) plays FROM listens WHERE {cond} GROUP BY source", a),
        "per_day": rows(f"SELECT {LOCAL} day, COUNT(*) plays FROM listens WHERE {cond} GROUP BY day ORDER BY day", a),
        "moods": rows("SELECT mood, COUNT(*) n FROM notes WHERE mood IS NOT NULL AND mood!='' "
                      "GROUP BY mood ORDER BY n DESC"),
    }

# ---------- sync ----------
@app.post("/api/sync")
def trigger_sync(bg: BackgroundTasks, source: Optional[str] = None, wait: bool = False):
    names = [source] if source else None
    if source and source not in sync.SOURCES:
        raise HTTPException(400, f"unknown source; choose from {list(sync.SOURCES)}")
    if wait:
        return sync.run_sync(names)
    bg.add_task(sync.run_sync, names)
    return {"status": "started"}

@app.get("/api/sync/status")
def sync_status():
    return rows("SELECT * FROM sync_log ORDER BY id DESC LIMIT 20")

# ---------- pulse line + day titles (used by the diary screen) ----------
DEFAULT_SECS = 210  # assumed length when a source gives none

@app.get("/api/pulse")
def pulse(days: int = Query(45, ge=1, le=730)):
    """One entry per day (empty days included): minutes listened, track count, title, mood."""
    end = date.today()
    start = end - timedelta(days=days - 1)
    data = {r["day"]: r for r in rows(
        f"SELECT {LOCAL} AS day, COUNT(*) AS tracks, SUM(COALESCE(dur,{DEFAULT_SECS})) AS secs "
        f"FROM listens WHERE {LOCAL}>=? GROUP BY day", (start.isoformat(),))}
    titles = {r["day"]: r["title"] for r in rows("SELECT day, title FROM day_titles")}
    moods = {r["day"]: r["mood"] for r in rows(
        "SELECT day, mood FROM notes WHERE mood IS NOT NULL AND mood!='' GROUP BY day")}
    out = []
    for i in range(days):
        d = (start + timedelta(days=i)).isoformat()
        r = data.get(d)
        out.append({"day": d, "tracks": r["tracks"] if r else 0,
                    "minutes": round((r["secs"] if r else 0) / 60, 1),
                    "title": titles.get(d, ""), "mood": moods.get(d)})
    return out

class TitleIn(BaseModel):
    title: str

@app.put("/api/days/{day}/title")
def set_title(day: str, t: TitleIn):
    with db.conn() as c:
        if t.title.strip():
            c.execute("INSERT INTO day_titles(day,title) VALUES (?,?) "
                      "ON CONFLICT(day) DO UPDATE SET title=excluded.title", (day, t.title.strip()))
        else:
            c.execute("DELETE FROM day_titles WHERE day=?", (day,))
    return {"day": day, "title": t.title.strip()}

_preview_cache = {}

def get_track_preview(track: str, artist: str = ""):
    key = f"{track}::{artist}".lower().strip()
    if not key:
        return {"audio": None, "art": None}
    if key in _preview_cache:
        return _preview_cache[key]
    query = f"{track} {artist}".strip()
    try:
        url = f"https://itunes.apple.com/search?term={urllib.parse.quote(query)}&entity=song&limit=1"
        req = urllib.request.Request(url, headers={"User-Agent": "Echoes/1.0"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode())
            if data.get("resultCount", 0) > 0:
                res = data["results"][0]
                art = res.get("artworkUrl100", "")
                if art:
                    art = art.replace("100x100bb.jpg", "600x600bb.jpg")
                info = {
                    "audio": res.get("previewUrl"),
                    "art": art or None,
                }
                _preview_cache[key] = info
                return info
    except Exception:
        pass
    info = {"audio": None, "art": None}
    _preview_cache[key] = info
    return info

@app.get("/api/preview")
def preview(track: str, artist: str = ""):
    return get_track_preview(track, artist)

@app.get("/api/last-played")
def last_played():
    r = rows("SELECT source, track, artist, album, ref, played_at, approx FROM listens "
             "ORDER BY played_at DESC, id DESC LIMIT 1")
    if not r:
        return None
    item = dict(r[0])
    extra = get_track_preview(item.get("track", ""), item.get("artist", ""))
    item.update(extra)
    return item

# must come last: serves the diary screen at http://localhost:8000/
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/", StaticFiles(directory=static_dir, html=True), name="ui")
