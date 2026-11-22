import React, { useState, useEffect } from "react";
import { api } from "../config/api";
import { usePlayer } from "../context/PlayerContext";
import {
  Calendar,
  Clock,
  Music,
  Disc,
  Edit2,
  Check,
  X,
  RefreshCw,
  Play,
  Pause,
} from "lucide-react";
import { SurfaceCard, PillBadge, AppButton } from "../components/SharedUI";
import PulseLine from "../components/PulseLine";

export default function TimelineScreen({ selectedDay: initialDay }) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();

  const [days, setDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(initialDay || null);
  const [dayDetails, setDayDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Day Title Editing State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [dayTitleInput, setDayTitleInput] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const [pulseRefreshKey, setPulseRefreshKey] = useState(0);

  useEffect(() => {
    loadTimeline();
  }, []);

  useEffect(() => {
    if (selectedDay) {
      loadDayDetails(selectedDay);
    }
  }, [selectedDay]);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const data = await api.getTimeline({ limit: 60 });
      setDays(data || []);
      if (!selectedDay && data?.length > 0) {
        setSelectedDay(data[0].day);
      }
    } catch (err) {
      console.error("Failed to load timeline:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadDayDetails = async (day) => {
    setLoadingDetails(true);
    setIsEditingTitle(false);
    try {
      const [data, pulseData] = await Promise.all([
        api.getDay(day),
        api.getPulse(90).catch(() => []),
      ]);
      setDayDetails(data);
      const match = (pulseData || []).find((p) => p.day === day);
      setDayTitleInput(match?.title || "");
    } catch (err) {
      console.error("Failed to load day details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSyncListens = async () => {
    setSyncing(true);
    try {
      await api.triggerSync(null, true);
      await Promise.all([
        loadTimeline(),
        selectedDay ? loadDayDetails(selectedDay) : Promise.resolve(),
      ]);
      setPulseRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setSyncing(false);
    }
  };

  const isTrackCurrentlyPlaying = (track) => {
    if (!isPlaying || !currentTrack) return false;
    if (currentTrack.id === track.id) return true;
    return (
      currentTrack.track?.toLowerCase() === track.track?.toLowerCase() &&
      currentTrack.artist?.toLowerCase() === track.artist?.toLowerCase()
    );
  };

  const handlePlayTrack = (track) => {
    if (isTrackCurrentlyPlaying(track)) {
      togglePlay();
    } else {
      playTrack(track, dayDetails?.listens || []);
    }
  };

  const handleSaveTitle = async (e) => {
    e?.preventDefault();
    if (!selectedDay) return;

    setSavingTitle(true);
    try {
      await api.setDayTitle(selectedDay, dayTitleInput.trim());
      setIsEditingTitle(false);
      setPulseRefreshKey((prev) => prev + 1);
      loadTimeline();
    } catch (err) {
      alert("Failed to save title: " + err.message);
    } finally {
      setSavingTitle(false);
    }
  };

  const formatDuration = (secs) => {
    if (!secs) return "3:30";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const formatPlayedAt = (isoString) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const formatDayLabel = (dayStr) => {
    if (!dayStr) return "";
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (dayStr === today) return "Today";
    if (dayStr === yesterday) return "Yesterday";
    try {
      const d = new Date(dayStr + "T00:00:00");
      return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    } catch {
      return dayStr;
    }
  };

  const formatFullDate = (dayStr) => {
    if (!dayStr) return "";
    try {
      const d = new Date(dayStr + "T00:00:00");
      return d.toLocaleDateString([], {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dayStr;
    }
  };

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

  // Derived metrics for dayDetails
  const totalListensCount = dayDetails?.listens?.length || 0;
  const totalSecs = (dayDetails?.listens || []).reduce(
    (acc, t) => acc + (t.dur || 210),
    0
  );
  const totalMins = Math.round(totalSecs / 60);

  // Compute top artist for the day
  const artistCounts = {};
  (dayDetails?.listens || []).forEach((t) => {
    if (t.artist) {
      artistCounts[t.artist] = (artistCounts[t.artist] || 0) + 1;
    }
  });
  const topArtistEntry = Object.entries(artistCounts).sort((a, b) => b[1] - a[1])[0];
  const topArtist = topArtistEntry ? topArtistEntry[0] : null;

  return (
    <div className="screen-container space-y-5 sm:space-y-6 animate-fade-in">
      {/* Header - Fluid responsive flex */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="heading-hero text-xl sm:text-2xl md:text-3xl text-[var(--ink)]">
            Daily Listening
          </h1>
          <p className="text-xs text-[var(--ink-soft)] mt-0.5">
            Automatic tracking across Spotify, YouTube Music, and Amazon Music
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-[var(--aubergine-soft)] text-[var(--primary)] text-[11px] sm:text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
            <span>Auto-Tracking Active</span>
          </div>

          <AppButton
            icon={RefreshCw}
            label={syncing ? "Syncing..." : "Sync Listens"}
            onPress={handleSyncListens}
            className={`text-xs py-1.5 sm:py-2 px-3 sm:px-3.5 ${syncing ? "opacity-75" : ""}`}
          />
        </div>
      </div>

      {/* Listening Pulse Graph */}
      <PulseLine
        selectedDay={selectedDay}
        onSelectDay={(day) => setSelectedDay(day)}
        refreshTrigger={pulseRefreshKey}
      />

      {loading ? (
        <div className="py-12 text-center text-[var(--ink-soft)]">
          <Disc className="w-7 h-7 mx-auto animate-spin text-[var(--primary)] mb-1" />
          <p className="text-xs">Loading tracked days...</p>
        </div>
      ) : days.length === 0 ? (
        <SurfaceCard className="p-8 sm:p-10 text-center text-[var(--ink-soft)] space-y-2">
          <Calendar className="w-8 h-8 mx-auto text-[var(--ink-faint)]" />
          <p className="font-semibold text-sm text-[var(--ink)]">
            No daily songs recorded yet
          </p>
          <p className="text-xs">
            Connect Spotify, YouTube Music, or Amazon Music to start tracking your daily listening history.
          </p>
        </SurfaceCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 items-start">
          {/* Left Column: Mobile horizontal swipeable date bar; Desktop vertical sidebar */}
          <div className="md:col-span-1">
            <div className="flex items-center justify-between pb-1.5 px-1">
              <span className="text-[11px] font-semibold text-[var(--ink-faint)] uppercase tracking-wider">
                Tracked Days ({days.length})
              </span>
              <span className="text-[10px] text-[var(--ink-faint)] md:hidden">
                Swipe horizontally →
              </span>
            </div>

            <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto no-scrollbar md:max-h-[70vh] pb-2 md:pb-0 pr-0.5">
              {days.map((d) => {
                const isSelected = selectedDay === d.day;
                return (
                  <div
                    key={d.day}
                    onClick={() => setSelectedDay(d.day)}
                    className={`p-2.5 sm:p-3 rounded-2xl cursor-pointer transition-all duration-200 border min-w-[135px] sm:min-w-[155px] md:min-w-0 md:w-full shrink-0 md:shrink ${
                      isSelected
                        ? "bg-[var(--aubergine-soft)] border-[var(--primary)] shadow-sm scale-[1.01]"
                        : "bg-[var(--card)] border-[var(--border)] hover:border-[var(--primary)]/50 hover:-translate-y-0.5"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 gap-1">
                      <div className="flex flex-col min-w-0">
                        <span
                          className={`font-fraunces text-xs sm:text-sm font-bold truncate ${
                            isSelected ? "text-[var(--primary)] font-extrabold" : "text-[var(--ink)]"
                          }`}
                        >
                          {formatDayLabel(d.day)}
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-[var(--ink-faint)] font-mono">
                          {d.day}
                        </span>
                      </div>

                      <span className="text-[10px] sm:text-[11px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-[var(--card-alt)] text-[var(--ink-soft)] shrink-0">
                        {d.listens} tracks
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] sm:text-xs text-[var(--ink-soft)] mt-1">
                      <span className="truncate">
                        Top: <strong className="text-[var(--ink)]">{d.top_artist || "—"}</strong>
                      </span>

                      {d.total_secs ? (
                        <span className="text-[9px] sm:text-[10px] font-mono text-[var(--ink-faint)] shrink-0 ml-1">
                          {Math.round(d.total_secs / 60)}m
                        </span>
                      ) : null}
                    </div>

                    {/* Platform badges / indicators */}
                    {d.sources && (
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {d.sources.split(",").map((s) => (
                          <span
                            key={s}
                            className={`px-1.5 py-0.2 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider ${
                              s === "spotify"
                                ? "bg-[#1DB954]/15 text-[#1DB954]"
                                : s === "ytmusic"
                                ? "bg-[#FF0000]/15 text-[#FF0000]"
                                : "bg-[#FF9900]/15 text-[#FF9900]"
                            }`}
                          >
                            {s === "spotify" ? "Spotify" : s === "ytmusic" ? "YT" : "Amazon"}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Day Detail View */}
          <div className="md:col-span-2 space-y-3 sm:space-y-4">
            {loadingDetails ? (
              <SurfaceCard className="p-8 sm:p-10 text-center text-[var(--ink-soft)]">
                <Disc className="w-7 h-7 mx-auto animate-spin text-[var(--primary)] mb-1" />
                <p className="text-xs">Loading tracks for {selectedDay}...</p>
              </SurfaceCard>
            ) : !dayDetails ? (
              <SurfaceCard className="p-6 sm:p-8 text-center text-xs text-[var(--ink-soft)]">
                Select a day to view tracked songs.
              </SurfaceCard>
            ) : (
              <div className="space-y-3 sm:space-y-4 animate-fade-in">
                {/* Day Summary Card */}
                <SurfaceCard className="p-3.5 sm:p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] sm:text-[11px] font-semibold text-[var(--primary)] uppercase tracking-wider block">
                        Daily Listening Log
                      </span>
                      <h2 className="font-fraunces text-lg sm:text-2xl font-bold text-[var(--ink)] truncate">
                        {formatFullDate(dayDetails.day)}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <span className="text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1 rounded-full bg-[var(--primary)] text-white shadow-sm">
                        {totalListensCount} tracks
                      </span>
                      {totalMins > 0 && (
                        <span className="text-[11px] sm:text-xs font-semibold px-2 sm:px-2.5 py-1 rounded-full bg-[var(--card-alt)] text-[var(--ink-soft)]">
                          {totalMins} mins
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick KPI stats bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--border-light)]">
                    <div className="p-2 rounded-xl bg-[var(--card-alt)]/50">
                      <span className="text-[9px] sm:text-[10px] text-[var(--ink-soft)] block">Total Songs</span>
                      <span className="text-xs sm:text-sm font-bold text-[var(--ink)]">{totalListensCount}</span>
                    </div>

                    <div className="p-2 rounded-xl bg-[var(--card-alt)]/50">
                      <span className="text-[9px] sm:text-[10px] text-[var(--ink-soft)] block">Listening Time</span>
                      <span className="text-xs sm:text-sm font-bold text-[var(--ink)]">{totalMins} min</span>
                    </div>

                    <div className="p-2 rounded-xl bg-[var(--card-alt)]/50 truncate">
                      <span className="text-[9px] sm:text-[10px] text-[var(--ink-soft)] block">Top Artist</span>
                      <span className="text-xs sm:text-sm font-bold text-[var(--ink)] truncate block">
                        {topArtist || "—"}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-[var(--card-alt)]/50">
                      <span className="text-[9px] sm:text-[10px] text-[var(--ink-soft)] block">Platforms</span>
                      <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5 flex-wrap">
                        {Array.from(new Set(dayDetails.listens?.map((l) => l.source) || [])).map(
                          (s) => (
                            <span
                              key={s}
                              className={`px-1.5 py-0.2 rounded text-[8px] sm:text-[9px] font-bold uppercase ${
                                s === "spotify"
                                  ? "bg-[#1DB954]/20 text-[#1DB954]"
                                  : s === "ytmusic"
                                  ? "bg-[#FF0000]/20 text-[#FF0000]"
                                  : "bg-[#FF9900]/20 text-[#FF9900]"
                              }`}
                            >
                              {s === "spotify" ? "Spotify" : s === "ytmusic" ? "YT" : "Amazon"}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Day Title if present / editable */}
                  <div className="pt-2 border-t border-[var(--border-light)]">
                    {isEditingTitle ? (
                      <form
                        onSubmit={handleSaveTitle}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={dayTitleInput}
                          onChange={(e) => setDayTitleInput(e.target.value)}
                          placeholder="Add day title (e.g. Chill Sunday Vibes)..."
                          className="flex-1 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm bg-[var(--card-alt)] border border-[var(--primary)] outline-none text-[var(--ink)]"
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={savingTitle}
                          className="p-1.5 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition"
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingTitle(false)}
                          className="p-1.5 rounded-lg bg-[var(--card-alt)] text-[var(--ink-soft)] hover:text-[var(--ink)] transition"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between group gap-2">
                        {dayTitleInput ? (
                          <span className="font-fraunces text-xs sm:text-base font-bold text-[var(--primary)] truncate">
                            "{dayTitleInput}"
                          </span>
                        ) : (
                          <span className="text-[11px] sm:text-xs text-[var(--ink-faint)] italic">
                            No title for this day
                          </span>
                        )}

                        <button
                          onClick={() => setIsEditingTitle(true)}
                          className="flex items-center gap-1 text-[11px] sm:text-xs text-[var(--primary)] hover:underline opacity-80 group-hover:opacity-100 transition shrink-0"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>{dayTitleInput ? "Edit title" : "Add title"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </SurfaceCard>

                {/* Day Listens Track List - THE HERO SECTION */}
                <div className="space-y-2.5 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-fraunces text-base sm:text-lg font-bold text-[var(--ink)] flex items-center gap-2">
                      <Music className="w-4 h-4 text-[var(--primary)]" />
                      <span>Songs Listened ({totalListensCount})</span>
                    </h3>
                    <span className="text-[11px] sm:text-xs text-[var(--ink-soft)]">
                      Chronological log
                    </span>
                  </div>

                  {!dayDetails.listens || dayDetails.listens.length === 0 ? (
                    <SurfaceCard className="p-6 sm:p-8 text-center text-xs text-[var(--ink-soft)]">
                      No tracks logged for this day.
                    </SurfaceCard>
                  ) : (
                    <div className="divide-y divide-[var(--border)] bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
                      {dayDetails.listens.map((track, idx) => {
                        const isCurrentlyPlaying = isTrackCurrentlyPlaying(track);
                        const playedTime = formatPlayedAt(track.played_at);

                        return (
                          <div
                            key={track.id || idx}
                            onClick={() => handlePlayTrack(track)}
                            style={{ animationDelay: `${Math.min(idx * 30, 360)}ms` }}
                            className={`stagger-item p-2.5 sm:p-3.5 flex items-center justify-between gap-2 sm:gap-3 transition duration-200 cursor-pointer ${
                              isCurrentlyPlaying
                                ? "bg-[var(--aubergine-soft)]/60 shadow-sm border-l-4 border-l-[var(--primary)]"
                                : "hover:bg-[var(--paper)]"
                            }`}
                          >
                            {/* Left: Play button, track index, title, artist, album */}
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePlayTrack(track);
                                }}
                                className={`group/btn w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
                                  isCurrentlyPlaying
                                    ? "bg-[var(--primary)] text-white shadow-md ring-2 ring-[var(--primary)]/30"
                                    : "bg-[var(--card-alt)] text-[var(--ink)] hover:bg-[var(--primary)] hover:text-white"
                                }`}
                                title={
                                  isCurrentlyPlaying
                                    ? "Pause in Echoes"
                                    : "Play in Echoes"
                                }
                              >
                                {isCurrentlyPlaying ? (
                                  <>
                                    <div className="eq-container text-white group-hover/btn:hidden">
                                      <span className="eq-bar eq-bar-1" />
                                      <span className="eq-bar eq-bar-2" />
                                      <span className="eq-bar eq-bar-3" />
                                    </div>
                                    <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current hidden group-hover/btn:block text-white" />
                                  </>
                                ) : (
                                  <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current ml-0.5" />
                                )}
                              </button>

                              <span className="text-[10px] sm:text-xs font-semibold text-[var(--ink-faint)] w-3 sm:w-4 text-center shrink-0">
                                {idx + 1}
                              </span>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-xs sm:text-sm font-bold text-[var(--ink)] truncate">
                                    {track.track}
                                  </h4>
                                  {isCurrentlyPlaying && (
                                    <span className="text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-[var(--primary)] text-white shrink-0 animate-pulse">
                                      Playing in Echoes
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-[var(--ink-soft)] truncate mt-0.5">
                                  <span className="truncate">{track.artist}</span>
                                  {track.album && (
                                    <>
                                      <span className="text-[var(--ink-faint)] hidden sm:inline">•</span>
                                      <span className="truncate opacity-80 hidden sm:inline">
                                        {track.album}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right: Timestamp, platform badge, duration */}
                            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                              {playedTime && (
                                <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono text-[var(--ink-soft)] px-1.5 sm:px-2 py-0.5 rounded-md bg-[var(--card-alt)]">
                                  <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[var(--ink-faint)]" />
                                  <span>{playedTime}</span>
                                </div>
                              )}

                              <div className="hidden xs:block sm:block">
                                {getSourceBadge(track.source)}
                              </div>

                              <span className="text-[10px] sm:text-xs font-mono text-[var(--ink-faint)] w-8 sm:w-10 text-right">
                                {formatDuration(track.dur)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
