# Echoes 🎧

**Echoes** is a personal Music Diary application that unifies your listening history across **YouTube Music**, **Spotify**, and **Amazon Music** into a local SQLite database, paired with a web frontend built with the exact UI design system and screens of **CompareX**.

It provides a rich REST API and responsive interface for timelines, daily listening logs, historical "On This Day" throwbacks, mood journaling, statistical insights, and automated background sync.

---

## ⚡ Quickstart

### 1. Setup Virtual Environment & Backend Dependencies

```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install Python packages and Playwright browser
pip install -r requirements.txt
playwright install chromium
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials and preferences
set -a; source .env; set +a
```

### 3. Launch Server & Web Frontend

```bash
# Terminal 1: Launch FastAPI Backend
uvicorn main:app --reload

# Terminal 2: Launch Web Frontend (Vite)
cd frontend
npm install
npm run dev
```

- **Interactive API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Web App (CompareX UI):** [http://localhost:5173](http://localhost:5173)

---

## 🎨 Design System (CompareX Clear Commerce System)

The web frontend adopts the exact design language, styling tokens, and screens from **CompareX**:
- **Palette:** Grounded Forest Green (`#16845B`), Paper Neutral surfaces (`#F7F8F7`), Deep Emerald Radar (`#0D4F3C`), Ink Text (`#18201C`), and status tokens.
- **Typography:** `Fraunces` (Editorial Serif for headings and radar badges) + `Inter` (UI Body & Controls).
- **Screens:**
  - **Login Page (`LoginScreen.jsx`):** Exact CompareX hero section, `SurfaceCard` with email & password fields, eye toggle, pill `AppButton`, and demo access.
  - **Register / Sign Up Page (`RegisterScreen.jsx`):** Back navigation, full name, email, password confirmation, terms checkbox, and account creation.
  - **Home Dashboard (`HomeScreen.jsx`):** Time-aware greeting (`Good morning / afternoon / evening, {name}`), `LiquidGlass` search/prompt composer, and deep emerald **Music Radar Card** with ambient glows and throwback memories.
  - **Search Page (`SearchScreen.jsx`):** Live search with clear button, platform filters (Spotify, YouTube Music, Amazon Music), suggestion chips, and track cards with play links.
  - **Accounts Page (`AccountsScreen.jsx`):** Platform connection management for Spotify, YouTube Music, and Amazon Music, global sync trigger, and live sync log table.
  - **Timeline Page (`TimelineScreen.jsx`):** Chronological diary with calendar selector, daily listen counts, top artists, and mood notes.
  - **Analytics Page (`StatsScreen.jsx`):** Breakdown of top 10 artists, top tracks, streaming source percentages, and mood frequencies.
  - **Navigation (`CustomTabBar.jsx`):** Floating liquid glass bottom pill with sliding lens animation.

---

## 🔌 Connecting Music Sources

### 1. YouTube Music (`ytmusicapi`)
Uses logged-in browser session headers (no password stored).
```bash
ytmusicapi browser
```
1. Follow the terminal prompt: open `music.youtube.com` in your browser (logged in).
2. Open DevTools -> Network tab -> copy request headers from an authenticated request.
3. Paste into the terminal prompt. This generates `browser.json`.
4. Point `YTM_AUTH=browser.json` in your `.env`.

### 2. Spotify (Official Web API)
Fetches the last 50 recently played tracks with exact millisecond timestamps.
1. Create an application in [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Add `http://127.0.0.1:8888/callback` as a Redirect URI in your app settings.
3. Set your credentials in `.env`:
   ```ini
   SPOTIPY_CLIENT_ID=your_client_id
   SPOTIPY_CLIENT_SECRET=your_client_secret
   SPOTIPY_REDIRECT_URI=http://127.0.0.1:8888/callback
   ```
4. Authorize once by running:
   ```bash
   python sync.py spotify
   ```
   A browser window will open to grant access and store `.spotify_cache`.

### 3. Amazon Music (Playwright Session Scraper)
Scrapes your recent listening history at `https://music.amazon.in/recents`.
1. Log in interactively once (supports 2FA / CAPTCHA):
   ```bash
   python -m scrapers.amazon login
   ```
   Log into your Amazon account in the browser window, then press Enter in the terminal. Your session will be saved to `amazon_session.json`.
2. Test and inspect selectors:
   ```bash
   python -m scrapers.amazon debug
   ```
   This generates `amazon_debug.png` and `amazon_debug.html` to verify or tune `AMAZON_SELECTOR` / DOM structure if Amazon updates their web player markup.

---

## 📦 Backfilling Past History

You can import years of past listening history from data exports:

### Spotify Extended Streaming History
Request your lifetime streaming history from Spotify Privacy Settings (JSON format):
```bash
python importers.py spotify path/to/Streaming_History_Audio_*.json
```
*(Automatically filters out skips <30s and podcasts)*

### YouTube Music / Google Takeout
Download your YouTube watch history from Google Takeout (select JSON format):
```bash
python importers.py youtube path/to/watch-history.json
```
*(Extracts music tracks and formats artist tags)*

---

## 🔄 Automatic Syncing & De-duplication

- **Background Scheduler:** An APScheduler background task automatically triggers `sync.run_sync()` every `SYNC_INTERVAL_MIN` minutes (default: 45 min; set `0` to disable).
- **Resilient Execution:** Scraper failures are isolated—a failure in one service logs to `sync_log` and never blocks the others.
- **De-duplication:**
  - **Spotify & Takeout (exact timestamp):** Enforced by `UNIQUE(source, track, artist, played_at)`.
  - **YT Music & Amazon (approximate dates):** Stored with `approx = 1` and de-duplicated to at most **one entry per track per day**.
- **Timezone Grouping:** All calendar days and summaries are calculated in the server's local timezone (`date(played_at, 'localtime')`).

---

## 📡 API Reference

### Timeline & History
- `GET /api/timeline?start=YYYY-MM-DD&end=YYYY-MM-DD&source=spotify&limit=60`
  Returns daily summaries with listen counts, top artist of the day, and associated mood tags.
- `GET /api/days/{day}` (e.g. `/api/days/2026-11-21`)
  Returns all tracks played on a given day and any associated notes/journal entries.
- `GET /api/on-this-day?date=YYYY-MM-DD`
  Finds music you played on this exact month and day in previous years.
- `GET /api/search?q={query}&limit=50`
  Full-text search across track titles, artists, and album names.

### Notes & Mood Journaling
- `POST /api/notes`
  ```json
  {
    "day": "2026-11-21",
    "listen_id": 42,
    "mood": "nostalgic",
    "text": "Evening rainy drive listening to indie folk"
  }
  ```
- `PATCH /api/notes/{nid}`
  Update `mood` or `text`.
- `DELETE /api/notes/{nid}`
  Remove a note.

### Analytics & Synchronization
- `GET /api/stats?start=YYYY-MM-DD&end=YYYY-MM-DD`
  Aggregated statistics: total listens, top 10 artists, top 10 tracks, breakdown by streaming source, daily distribution, and mood counts.
- `POST /api/sync?source={source}&wait=false`
  Triggers a sync across all sources or a specific source (`ytmusic`, `spotify`, `amazon`). Runs in the background by default, or blocks until complete when `wait=true`.
- `GET /api/sync/status`
  Returns the last 20 sync execution runs, added count, and any encountered errors.
