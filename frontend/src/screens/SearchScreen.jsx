import React, { useState, useEffect, useRef } from "react";
import { api } from "../config/api";
import {
  Search as SearchIcon,
  X,
  ExternalLink,
  Music,
  Clock,
  Disc,
  Play,
  Pause,
  Plus,
  Check,
  Radio,
  Sparkles,
  Globe,
  BookOpen,
} from "lucide-react";
import { SurfaceCard, PillBadge } from "../components/SharedUI";

const SUGGESTIONS = [
  "Pushpa",
  "Arctic Monkeys",
  "Daft Punk",
  "The Weeknd",
  "Arijit Singh",
  "Coldplay",
  "Taylor Swift",
  "Lo-Fi Beats",
  "Indie Rock",
  "Interstellar",
];

const PLATFORMS = ["All", "spotify", "ytmusic", "amazon"];

export default function SearchScreen({ initialQuery = "" }) {
  const [query, setQuery] = useState(initialQuery);
  const [platform, setPlatform] = useState("All");
  const [diaryResults, setDiaryResults] = useState([]);
  const [globalResults, setGlobalResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [loggedIds, setLoggedIds] = useState(new Set());
  const [activeTab, setActiveTab] = useState("all"); // "all", "diary", "global"

  // Audio Preview playback
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const audioRef = useRef(null);
  const debounceTimer = useRef(null);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      runSearch(initialQuery);
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [initialQuery]);

  const handleQueryChange = (text) => {
    setQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!text.trim()) {
      setDiaryResults([]);
      setGlobalResults([]);
      setSearched(false);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      runSearch(text);
    }, 280);
  };

  const runSearch = async (searchTerm) => {
    const q = (searchTerm || query).trim();
    if (!q) return;

    setLoading(true);
    setSearched(true);
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingTrackId(null);
    }

    try {
      const [diaryRes, globalRes] = await Promise.allSettled([
        api.search(q, 100),
        api.searchGlobal(q, 20),
      ]);

      setDiaryResults(diaryRes.status === "fulfilled" && diaryRes.value ? diaryRes.value : []);
      setGlobalResults(globalRes.status === "fulfilled" && globalRes.value ? globalRes.value : []);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setDiaryResults([]);
    setGlobalResults([]);
    setSearched(false);
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingTrackId(null);
    }
  };

  const handlePlayPreview = (track) => {
    if (playingTrackId === track.id) {
      if (audioRef.current) audioRef.current.pause();
      setPlayingTrackId(null);
      return;
    }

    if (audioRef.current) audioRef.current.pause();

    if (track.audio) {
      const audio = new Audio(track.audio);
      audio.onended = () => setPlayingTrackId(null);
      audio.onerror = () => setPlayingTrackId(null);
      audio.play();
      audioRef.current = audio;
      setPlayingTrackId(track.id);
    } else if (track.ref) {
      window.open(track.ref, "_blank");
    }
  };

  const handleLogToDiary = async (track) => {
    try {
      await api.logListen({
        track: track.track,
        artist: track.artist,
        album: track.album,
        source: "spotify",
        ref: track.spotify_ref || track.ref,
        dur: track.dur || 210,
      });

      setLoggedIds((prev) => new Set([...prev, track.id]));

      // Refresh local diary results
      const updatedDiary = await api.search(query, 100);
      setDiaryResults(updatedDiary || []);
    } catch (err) {
      console.error("Failed to log listen:", err);
    }
  };

  const filteredDiary = diaryResults.filter((item) => {
    if (platform === "All") return true;
    return item.source?.toLowerCase() === platform.toLowerCase();
  });

  const getSourceBadge = (source) => {
    switch (source?.toLowerCase()) {
      case "spotify":
        return <PillBadge color="spotify">Spotify</PillBadge>;
      case "ytmusic":
        return <PillBadge color="ytmusic">YT Music</PillBadge>;
      case "amazon":
        return <PillBadge color="amazon">Amazon</PillBadge>;
      case "catalog":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--aubergine-soft)] text-[var(--primary)]">
            Global Catalog
          </span>
        );
      default:
        return <PillBadge color="primary">{source}</PillBadge>;
    }
  };

  const totalResultsCount =
    activeTab === "diary"
      ? filteredDiary.length
      : activeTab === "global"
      ? globalResults.length
      : filteredDiary.length + globalResults.length;

  return (
    <div className="screen-container space-y-4 sm:space-y-5 animate-fade-in">
      {/* Search Input Bar */}
      <div className="relative flex items-center p-1.5 sm:p-2 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-sm focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary)]/20 transition duration-200">
        <div className="pl-2 sm:pl-3 pr-2 text-[var(--ink-faint)]">
          <SearchIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--primary)]" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search tracks, artists, movies, soundtracks..."
          className="flex-1 bg-transparent border-none outline-none text-sm sm:text-base text-[var(--ink)] placeholder-[var(--ink-faint)] pr-2"
          autoFocus={!initialQuery}
        />
        {query && (
          <button
            onClick={clearSearch}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-[var(--card-alt)] transition mr-1"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Scope Filter Tabs */}
      {searched && !loading && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              activeTab === "all"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "bg-[var(--card)] border border-[var(--border)] text-[var(--ink-soft)] hover:text-[var(--ink)]"
            }`}
          >
            All Results ({filteredDiary.length + globalResults.length})
          </button>
          <button
            onClick={() => setActiveTab("diary")}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              activeTab === "diary"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "bg-[var(--card)] border border-[var(--border)] text-[var(--ink-soft)] hover:text-[var(--ink)]"
            }`}
          >
            Diary History ({filteredDiary.length})
          </button>
          <button
            onClick={() => setActiveTab("global")}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              activeTab === "global"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "bg-[var(--card)] border border-[var(--border)] text-[var(--ink-soft)] hover:text-[var(--ink)]"
            }`}
          >
            Global Streaming Catalog ({globalResults.length})
          </button>
        </div>
      )}

      {/* Initial Suggestions when search is empty */}
      {!searched && (
        <div className="space-y-4 pt-1">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-soft)] mb-2 px-1">
              <Sparkles className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>Trending & Popular Searches</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((name) => (
                <button
                  key={name}
                  onClick={() => {
                    setQuery(name);
                    runSearch(name);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-xs font-medium text-[var(--ink)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <SurfaceCard className="p-4 sm:p-5 text-left space-y-2 bg-[var(--card-alt)]/50">
            <h3 className="font-fraunces text-sm sm:text-base font-bold text-[var(--ink)] flex items-center gap-2">
              <Globe className="w-4 h-4 text-[var(--primary)]" />
              <span>Hybrid Music Discovery</span>
            </h3>
            <p className="text-xs text-[var(--ink-soft)] leading-relaxed">
              Search finds songs across both your <strong>personal listening history</strong> and the <strong>global music catalog</strong>. Listen to 30-second previews with real-time equalizers, open tracks in Spotify & YouTube Music, or log them directly to your diary.
            </p>
          </SurfaceCard>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="py-12 text-center text-[var(--ink-soft)] space-y-2">
          <Disc className="w-8 h-8 mx-auto animate-spin text-[var(--primary)]" />
          <p className="text-xs font-medium">Searching diary and global catalog for "{query}"...</p>
        </div>
      )}

      {/* Results Section */}
      {!loading && searched && (
        <div className="space-y-5">
          {totalResultsCount === 0 ? (
            <SurfaceCard className="p-8 text-center text-[var(--ink-soft)] space-y-2">
              <Music className="w-8 h-8 mx-auto text-[var(--ink-faint)]" />
              <p className="font-semibold text-sm text-[var(--ink)]">No matches found</p>
              <p className="text-xs">No tracks found for "{query}". Try checking your spelling or search by artist name.</p>
            </SurfaceCard>
          ) : (
            <>
              {/* SECTION 1: Diary History Results */}
              {(activeTab === "all" || activeTab === "diary") && filteredDiary.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="font-fraunces text-sm sm:text-base font-bold text-[var(--ink)] flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-[var(--primary)]" />
                      <span>In Your Diary History ({filteredDiary.length})</span>
                    </h3>
                    <span className="text-[11px] text-[var(--ink-soft)]">
                      Previously listened
                    </span>
                  </div>

                  <div className="grid gap-2">
                    {filteredDiary.map((item, idx) => (
                      <SurfaceCard
                        key={item.id}
                        style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                        className="stagger-item p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[var(--primary)]/50 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 group"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-[var(--card-alt)] flex items-center justify-center text-[var(--primary)] shrink-0 shadow-sm">
                            <Music className="w-5 h-5" />
                          </div>

                          <div className="min-w-0">
                            <h4 className="font-fraunces text-sm font-bold text-[var(--ink)] truncate group-hover:text-[var(--primary)] transition">
                              {item.track}
                            </h4>
                            <p className="text-xs text-[var(--ink-soft)] truncate">
                              {item.artist} {item.album && `• ${item.album}`}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--ink-faint)]">
                              <span className="flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3" />
                                {item.played_at ? item.played_at.replace("T", " ").replace("Z", "") : ""}
                              </span>
                              {item.approx ? (
                                <span className="text-amber-500 font-semibold">• approx</span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {getSourceBadge(item.source)}

                          {item.ref && (
                            <a
                              href={item.ref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-7 h-7 rounded-full flex items-center justify-center bg-[var(--card-alt)] text-[var(--ink-soft)] hover:text-[var(--primary)] transition"
                              title="Open track"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </SurfaceCard>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 2: Global Music Catalog Results */}
              {(activeTab === "all" || activeTab === "global") && globalResults.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="font-fraunces text-sm sm:text-base font-bold text-[var(--ink)] flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-[var(--primary)]" />
                      <span>Global Music Catalog ({globalResults.length})</span>
                    </h3>
                    <span className="text-[11px] text-[var(--ink-soft)]">
                      Instant audio previews & streaming links
                    </span>
                  </div>

                  <div className="grid gap-2">
                    {globalResults.map((item, idx) => {
                      const isPlaying = playingTrackId === item.id;
                      const isLogged = loggedIds.has(item.id);

                      return (
                        <SurfaceCard
                          key={item.id}
                          style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                          className={`stagger-item p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[var(--primary)]/60 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 group ${
                            isPlaying ? "bg-[var(--aubergine-soft)]/50 border-[var(--primary)]" : ""
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            {/* Artwork or Audio Preview Trigger */}
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-[var(--card-alt)] shadow-sm group/art">
                              {item.art ? (
                                <img
                                  src={item.art}
                                  alt={item.track}
                                  className="w-full h-full object-cover group-hover/art:scale-105 transition duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[var(--primary)]">
                                  <Music className="w-5 h-5" />
                                </div>
                              )}

                              {item.audio && (
                                <button
                                  type="button"
                                  onClick={() => handlePlayPreview(item)}
                                  className={`absolute inset-0 flex items-center justify-center transition ${
                                    isPlaying
                                      ? "bg-black/50 text-white"
                                      : "bg-black/30 opacity-0 group-hover/art:opacity-100 text-white"
                                  }`}
                                  title={isPlaying ? "Pause preview" : "Play 30s preview"}
                                >
                                  {isPlaying ? (
                                    <div className="eq-container text-white">
                                      <span className="eq-bar eq-bar-1" />
                                      <span className="eq-bar eq-bar-2" />
                                      <span className="eq-bar eq-bar-3" />
                                    </div>
                                  ) : (
                                    <Play className="w-4 h-4 fill-current ml-0.5" />
                                  )}
                                </button>
                              )}
                            </div>

                            {/* Track Details */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-fraunces text-sm sm:text-base font-bold text-[var(--ink)] truncate group-hover:text-[var(--primary)] transition">
                                  {item.track}
                                </h4>
                                {isPlaying && (
                                  <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-[var(--primary)] text-white shrink-0 animate-pulse">
                                    Playing preview
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-[var(--ink-soft)] truncate">
                                <strong>{item.artist}</strong> {item.album && `• ${item.album}`}
                              </p>

                              <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--ink-faint)]">
                                {item.year && <span>{item.year}</span>}
                                {item.genre && <span>• {item.genre}</span>}
                                {item.dur && <span>• {Math.round(item.dur / 60)}:{String(item.dur % 60).padStart(2, "0")}</span>}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {/* Audio Preview button on desktop / tablet */}
                            {item.audio && (
                              <button
                                type="button"
                                onClick={() => handlePlayPreview(item)}
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition ${
                                  isPlaying
                                    ? "bg-[var(--primary)] text-white shadow-sm"
                                    : "bg-[var(--card-alt)] text-[var(--ink)] hover:bg-[var(--primary)] hover:text-white"
                                }`}
                                title={isPlaying ? "Pause preview" : "Play preview"}
                              >
                                {isPlaying ? (
                                  <>
                                    <div className="eq-container">
                                      <span className="eq-bar eq-bar-1" />
                                      <span className="eq-bar eq-bar-2" />
                                      <span className="eq-bar eq-bar-3" />
                                    </div>
                                    <span>Preview</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3 h-3 fill-current" />
                                    <span>Preview</span>
                                  </>
                                )}
                              </button>
                            )}

                            {/* Stream on Spotify link */}
                            <a
                              href={item.spotify_ref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded-full text-[11px] font-semibold bg-[#1DB954]/15 text-[#1DB954] hover:bg-[#1DB954] hover:text-white transition"
                              title="Listen on Spotify"
                            >
                              Spotify
                            </a>

                            {/* Stream on YouTube Music link */}
                            <a
                              href={item.ytmusic_ref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded-full text-[11px] font-semibold bg-[#FF0000]/15 text-[#FF0000] hover:bg-[#FF0000] hover:text-white transition"
                              title="Listen on YouTube Music"
                            >
                              YT
                            </a>

                            {/* Add to Diary Action */}
                            <button
                              type="button"
                              onClick={() => handleLogToDiary(item)}
                              disabled={isLogged}
                              className={`p-1.5 rounded-full transition flex items-center gap-1 text-xs font-semibold ${
                                isLogged
                                  ? "bg-green-100 text-green-700 cursor-default"
                                  : "bg-[var(--card-alt)] text-[var(--ink-soft)] hover:bg-[var(--primary)] hover:text-white"
                              }`}
                              title={isLogged ? "Logged to Diary" : "Log this listen to today's diary"}
                            >
                              {isLogged ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Plus className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </SurfaceCard>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
