import os, traceback
import db
from scrapers import ytmusic, spotify, amazon

SOURCES = {"ytmusic": ytmusic.fetch, "spotify": spotify.fetch, "amazon": amazon.fetch}

def run_sync(names=None):
    names = names or [s for s in os.getenv("SYNC_SOURCES", ",".join(SOURCES)).split(",") if s in SOURCES]
    report = {}
    for n in names:
        started, added, err = db.now_iso(), 0, None
        try:
            added = db.insert_listens(SOURCES[n]())
        except Exception as e:  # one broken scraper must not stop the others
            err = f"{type(e).__name__}: {e}"
            traceback.print_exc()
        with db.conn() as c:
            c.execute("INSERT INTO sync_log(source,started_at,added,error) VALUES (?,?,?,?)",
                      (n, started, added, err))
        report[n] = {"added": added, "error": err}
    return report

if __name__ == "__main__":
    import sys
    db.init()
    print(run_sync(sys.argv[1:] or None))
