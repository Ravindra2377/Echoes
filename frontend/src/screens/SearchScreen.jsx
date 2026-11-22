import React, { useState, useEffect, useRef } from "react";
import { api } from "../config/api";
import {
  Search as SearchIcon,
  X,
  ExternalLink,
  Music,
  Clock,
  Disc,
} from "lucide-react";
import { SurfaceCard, PillBadge } from "../components/SharedUI";

const SUGGESTIONS = [
  "Indie Rock",
  "Lo-Fi",
  "Electronic",
  "Daft Punk",
  "The Weeknd",
  "M83",
  "Ambient",
  "Jazz",
];

const PLATFORMS = ["All", "spotify", "ytmusic", "amazon"];

export default function SearchScreen({ initialQuery = "" }) {
  const [query, setQuery] = useState(initialQuery);
  const [platform, setPlatform] = useState("All");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceTimer = useRef(null);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      runSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleQueryChange = (text) => {
    setQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!text.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      runSearch(text);
    }, 300);
  };

  const runSearch = async (searchTerm) => {
    const q = (searchTerm || query).trim();
    if (!q) return;

    setLoading(true);
    setSearched(true);
    try {
      const data = await api.search(q, 100);
      setResults(data || []);
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setSearched(false);
  };

  const filteredResults = results.filter((item) => {
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
      default:
        return <PillBadge color="primary">{source}</PillBadge>;
    }
  };

  return (
    <div className="screen-container space-y-5 sm:space-y-6 animate-fade-in">
      {/* Search Input directly at top */}
      <div className="relative flex items-center p-1.5 sm:p-2 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-sm focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary)]/20 transition">
        <div className="pl-2 sm:pl-3 pr-2 text-[var(--ink-faint)]">
          <SearchIcon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search tracks, artists, albums..."
          className="flex-1 bg-transparent border-none outline-none text-sm sm:text-base text-[var(--ink)] placeholder-[var(--ink-faint)] pr-2"
          autoFocus={!initialQuery}
        />
        {query && (
          <button
            onClick={clearSearch}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-[var(--card-alt)] transition mr-1"
            title="Clear"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Platform Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {PLATFORMS.map((p) => {
          const isSelected = platform === p;
          const displayLabel =
            p === "All"
              ? "All Sources"
              : p === "spotify"
              ? "Spotify"
              : p === "ytmusic"
              ? "YouTube Music"
              : "Amazon Music";

          return (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                isSelected
                  ? "bg-[var(--primary)] text-white shadow-sm"
                  : "bg-[var(--card)] border border-[var(--border)] text-[var(--ink-soft)] hover:text-[var(--ink)]"
              }`}
            >
              {displayLabel}
            </button>
          );
        })}
      </div>

      {/* Quick Suggestion Chips */}
      {!searched && (
        <div className="pt-2">
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((name) => (
              <button
                key={name}
                onClick={() => {
                  setQuery(name);
                  runSearch(name);
                }}
                className="px-3 py-1.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-xs font-medium text-[var(--ink-soft)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition shadow-sm"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="py-12 text-center text-[var(--ink-soft)]">
          <Disc className="w-7 h-7 mx-auto animate-spin text-[var(--primary)] mb-1" />
          <p className="text-xs">Searching...</p>
        </div>
      )}

      {/* Results List */}
      {!loading && searched && (
        <div className="space-y-2.5">
          <div className="text-xs text-[var(--ink-soft)] px-1">
            {filteredResults.length} result{filteredResults.length === 1 ? "" : "s"}
          </div>

          {filteredResults.length === 0 ? (
            <SurfaceCard className="p-8 text-center text-[var(--ink-soft)] space-y-1">
              <p className="font-semibold text-sm text-[var(--ink)]">No matches found</p>
              <p className="text-xs">No tracks found for "{query}".</p>
            </SurfaceCard>
          ) : (
            <div className="grid gap-2">
              {filteredResults.map((item, idx) => (
                <SurfaceCard
                  key={item.id}
                  style={{ animationDelay: `${Math.min(idx * 25, 300)}ms` }}
                  className="stagger-item p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[var(--primary)] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-[var(--card-alt)] flex items-center justify-center text-[var(--primary)] shrink-0">
                      <Music className="w-4 h-4" />
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
          )}
        </div>
      )}
    </div>
  );
}
