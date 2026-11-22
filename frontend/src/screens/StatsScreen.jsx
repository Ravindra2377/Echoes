import React, { useState, useEffect } from "react";
import { api } from "../config/api";
import {
  TrendingUp,
  Award,
  Disc,
  Radio,
  Smile,
} from "lucide-react";
import { SurfaceCard } from "../components/SharedUI";

export default function StatsScreen() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to load stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const maxArtistPlays = stats?.top_artists?.[0]?.plays || 1;
  const maxTrackPlays = stats?.top_tracks?.[0]?.plays || 1;

  return (
    <div className="screen-container space-y-5 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="heading-hero text-xl sm:text-2xl md:text-3xl text-[var(--ink)]">
          Stats
        </h1>
      </div>

      {loading ? (
        <div className="py-20 text-center text-[var(--ink-soft)]">
          <Disc className="w-7 h-7 mx-auto animate-spin text-[var(--primary)] mb-1" />
          <p className="text-xs">Loading stats...</p>
        </div>
      ) : !stats ? (
        <SurfaceCard className="p-8 text-center text-xs text-[var(--ink-soft)]">
          No stats recorded.
        </SurfaceCard>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <SurfaceCard className="p-3 sm:p-4">
              <span className="text-[11px] sm:text-xs text-[var(--ink-soft)] block mb-1">
                Total Plays
              </span>
              <span className="font-fraunces text-xl sm:text-3xl font-bold text-[var(--ink)]">
                {stats.total || 0}
              </span>
            </SurfaceCard>

            <SurfaceCard className="p-3 sm:p-4">
              <span className="text-[11px] sm:text-xs text-[var(--ink-soft)] block mb-1">
                Artists
              </span>
              <span className="font-fraunces text-xl sm:text-3xl font-bold text-[var(--primary)]">
                {stats.top_artists?.length || 0}
              </span>
            </SurfaceCard>

            <SurfaceCard className="p-3 sm:p-4">
              <span className="text-[11px] sm:text-xs text-[var(--ink-soft)] block mb-1">
                Days Logged
              </span>
              <span className="font-fraunces text-xl sm:text-3xl font-bold text-[var(--coriander)]">
                {stats.per_day?.length || 0}
              </span>
            </SurfaceCard>

            <SurfaceCard className="p-3 sm:p-4">
              <span className="text-[11px] sm:text-xs text-[var(--ink-soft)] block mb-1">
                Mood Tags
              </span>
              <span className="font-fraunces text-xl sm:text-3xl font-bold text-[var(--turmeric)]">
                {stats.moods?.reduce((acc, m) => acc + m.n, 0) || 0}
              </span>
            </SurfaceCard>
          </div>

          {/* Breakdown by Streaming Platform */}
          <SurfaceCard className="p-4 sm:p-5 space-y-3">
            <h3 className="heading-3 text-base font-bold text-[var(--ink)] flex items-center gap-2">
              <Radio className="w-4 h-4 text-[var(--primary)]" />
              <span>By Platform</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {stats.by_source?.map((src) => {
                const plays = src.plays || 0;
                const percentage = stats.total > 0 ? Math.round((plays / stats.total) * 100) : 0;
                const isSpotify = src.source?.toLowerCase() === "spotify";
                const isYt = src.source?.toLowerCase() === "ytmusic";

                return (
                  <div
                    key={src.source}
                    className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--card-alt)] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-[var(--ink)]">
                        {isSpotify ? "Spotify" : isYt ? "YouTube Music" : "Amazon Music"}
                      </span>
                      <span className="font-mono text-[var(--primary)]">{percentage}%</span>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="font-fraunces text-xl font-bold text-[var(--ink)]">
                        {plays}
                      </span>
                      <span className="text-[11px] text-[var(--ink-soft)]">listens</span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: isSpotify ? "#1DB954" : isYt ? "#FF0000" : "#FF9900",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </SurfaceCard>

          {/* Top Artists & Top Tracks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Top Artists */}
            <SurfaceCard className="p-5 space-y-3">
              <h3 className="heading-3 text-base font-bold text-[var(--ink)] flex items-center gap-2">
                <Award className="w-4 h-4 text-[var(--primary)]" />
                <span>Top Artists</span>
              </h3>

              <div className="space-y-2.5">
                {(!stats.top_artists || stats.top_artists.length === 0) ? (
                  <p className="text-xs text-[var(--ink-faint)]">No artist data</p>
                ) : (
                  stats.top_artists.slice(0, 8).map((a, i) => (
                    <div key={a.artist} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[var(--ink)] truncate max-w-[200px]">
                          <span className="text-[var(--ink-faint)] mr-1.5">#{i + 1}</span>
                          {a.artist}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--ink-soft)]">
                          {a.plays} plays
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[var(--card-alt)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--primary)]"
                          style={{ width: `${(a.plays / maxArtistPlays) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SurfaceCard>

            {/* Top Tracks */}
            <SurfaceCard className="p-5 space-y-3">
              <h3 className="heading-3 text-base font-bold text-[var(--ink)] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[var(--primary)]" />
                <span>Top Tracks</span>
              </h3>

              <div className="space-y-2.5">
                {(!stats.top_tracks || stats.top_tracks.length === 0) ? (
                  <p className="text-xs text-[var(--ink-faint)]">No track data</p>
                ) : (
                  stats.top_tracks.slice(0, 8).map((t, i) => (
                    <div key={`${t.track}-${t.artist}`} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[var(--ink)] truncate max-w-[200px]">
                          <span className="text-[var(--ink-faint)] mr-1.5">#{i + 1}</span>
                          {t.track}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--ink-soft)]">
                          {t.plays} plays
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[var(--card-alt)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#116149]"
                          style={{ width: `${(t.plays / maxTrackPlays) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SurfaceCard>
          </div>

          {/* Moods Breakdown */}
          {stats.moods && stats.moods.length > 0 && (
            <SurfaceCard className="p-5 space-y-3">
              <h3 className="heading-3 text-base font-bold text-[var(--ink)] flex items-center gap-2">
                <Smile className="w-4 h-4 text-[var(--primary)]" />
                <span>Moods</span>
              </h3>

              <div className="flex flex-wrap gap-2 pt-1">
                {stats.moods.map((m) => (
                  <div
                    key={m.mood}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--aubergine-soft)] text-[var(--primary)] text-xs font-semibold"
                  >
                    <span>{m.mood}</span>
                    <span className="text-[10px] font-bold opacity-75">({m.n})</span>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          )}
        </div>
      )}
    </div>
  );
}
