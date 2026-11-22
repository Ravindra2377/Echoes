import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { usePlayer } from "../context/PlayerContext";
import { api } from "../config/api";
import {
  Clock,
  Headphones,
  Disc,
  Play,
} from "lucide-react";
import { SurfaceCard, PillBadge, AppButton } from "../components/SharedUI";
import LastPlayedDisc from "../components/LastPlayedDisc";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

export default function HomeScreen({ onNavigateSearch, onNavigateTimeline, onNavigateAccounts }) {
  const { user } = useAuth();
  const { playTrack } = usePlayer();
  const [onThisDay, setOnThisDay] = useState(null);
  const [recentTimeline, setRecentTimeline] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const firstName = user?.name?.split(" ")[0] || "there";

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    setLoading(true);
    try {
      const [otdData, tlData, statsData] = await Promise.allSettled([
        api.getOnThisDay(),
        api.getTimeline({ limit: 7 }),
        api.getStats(),
      ]);

      if (otdData.status === "fulfilled" && otdData.value?.length > 0) {
        setOnThisDay(otdData.value[0]);
      } else {
        setOnThisDay(null);
      }

      if (tlData.status === "fulfilled") {
        setRecentTimeline(tlData.value || []);
      }

      if (statsData.status === "fulfilled") {
        setStats(statsData.value);
      }
    } catch (err) {
      console.error("Failed to load home data:", err);
    } finally {
      setLoading(false);
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

  return (
    <div className="screen-container space-y-5 sm:space-y-6 animate-fade-in">
      {/* Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="heading-hero text-xl sm:text-2xl md:text-3xl text-[var(--ink)]">
          {getGreeting()}, {firstName}
        </h1>

        <div className="flex items-center gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-[var(--aubergine-soft)] text-[var(--primary)] text-[11px] sm:text-xs font-semibold self-start sm:self-auto shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary)] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--primary)]" />
          </span>
          <span>Tracking Active</span>
        </div>
      </div>

      {/* On This Day Card (only shown when actual history exists) */}
      {onThisDay && (
        <div className="relative rounded-2xl p-4 sm:p-6 bg-[var(--aubergine-deep)] border border-[var(--border)] text-white shadow-lg overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#8AD9B5]">
              On This Day
            </span>
            {getSourceBadge(onThisDay.source)}
          </div>

          <div className="space-y-1">
            <h2 className="font-fraunces text-xl sm:text-2xl font-bold text-white">
              {onThisDay.track}
            </h2>
            <p className="text-white/80 text-sm font-medium">
              {onThisDay.artist} • {onThisDay.plays || 1} play(s) recorded in earlier years
            </p>
          </div>

          <div className="pt-4 flex items-center gap-2.5 flex-wrap">
            <AppButton
              label="Play on Turntable"
              icon={Play}
              onPress={() => playTrack(onThisDay)}
              className="bg-white text-[#0D4F3C] hover:bg-neutral-100 font-bold px-4 py-2 text-xs shadow-md"
            />
            <AppButton
              label="Find in Library"
              icon={Disc}
              variant="secondary"
              onPress={() => onNavigateSearch(onThisDay.track)}
              className="bg-white/15 text-white hover:bg-white/25 border-none font-medium px-3.5 py-2 text-xs"
            />
          </div>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <SurfaceCard className="p-3 sm:p-4 flex flex-col justify-between">
          <span className="text-[11px] sm:text-xs font-medium text-[var(--ink-soft)]">
            Total Listens
          </span>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-2">
            <span className="font-fraunces text-xl sm:text-2xl font-bold text-[var(--ink)]">
              {stats?.total ?? 0}
            </span>
            <Headphones className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-3 sm:p-4 flex flex-col justify-between">
          <span className="text-[11px] sm:text-xs font-medium text-[var(--ink-soft)]">
            Top Artist
          </span>
          <div className="mt-1.5 sm:mt-2 truncate">
            <span className="font-fraunces text-base sm:text-lg font-bold text-[var(--ink)] truncate block">
              {stats?.top_artists?.[0]?.artist || "—"}
            </span>
            <span className="text-[10px] sm:text-[11px] text-[var(--ink-faint)]">
              {stats?.top_artists?.[0]?.plays ? `${stats.top_artists[0].plays} plays` : ""}
            </span>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-3 sm:p-4 flex flex-col justify-between">
          <span className="text-[11px] sm:text-xs font-medium text-[var(--ink-soft)]">
            Top Track
          </span>
          <div className="mt-1.5 sm:mt-2 truncate">
            <span className="font-fraunces text-base sm:text-lg font-bold text-[var(--ink)] truncate block">
              {stats?.top_tracks?.[0]?.track || "—"}
            </span>
            <span className="text-[10px] sm:text-[11px] text-[var(--ink-faint)]">
              {stats?.top_tracks?.[0]?.plays ? `${stats.top_tracks[0].plays} plays` : ""}
            </span>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-3 sm:p-4 flex flex-col justify-between">
          <span className="text-[11px] sm:text-xs font-medium text-[var(--ink-soft)]">
            Sources
          </span>
          <div className="mt-1.5 sm:mt-2 flex items-center gap-1 sm:gap-1.5 flex-wrap">
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-[#1DB954]/15 text-[#1DB954]">Spotify</span>
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-[#FF0000]/15 text-[#FF0000]">YT</span>
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-[#FF9900]/15 text-[#FF9900]">Amazon</span>
          </div>
        </SurfaceCard>
      </div>

      {/* Recent Days Timeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="heading-3 text-base font-bold text-[var(--ink)] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--primary)]" />
            <span>Recent Days</span>
          </h3>
          <button
            onClick={() => onNavigateTimeline()}
            className="text-xs font-semibold text-[var(--primary)] hover:underline"
          >
            All days →
          </button>
        </div>

        {recentTimeline.length === 0 ? (
          <SurfaceCard className="p-8 text-center text-[var(--ink-soft)] space-y-2">
            <p className="text-xs">No listening history recorded yet.</p>
            <AppButton
              variant="secondary"
              label="Sync Accounts"
              onPress={() => onNavigateAccounts()}
              className="text-xs py-1.5 px-3"
            />
          </SurfaceCard>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {recentTimeline.slice(0, 4).map((d) => (
              <SurfaceCard
                key={d.day}
                onClick={() => onNavigateTimeline(d.day)}
                className="p-4 cursor-pointer hover:border-[var(--primary)] hover:-translate-y-1 hover:shadow-md transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-fraunces text-sm font-bold text-[var(--ink)] group-hover:text-[var(--primary)] transition">
                    {d.day}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--card-alt)] text-[var(--ink-soft)]">
                    {d.listens} listen{d.listens === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-[var(--ink-soft)]">
                  <span>
                    Top: <strong className="text-[var(--ink)]">{d.top_artist || "—"}</strong>
                  </span>

                  {d.moods && d.moods.length > 0 && (
                    <div className="flex items-center gap-1">
                      {d.moods.slice(0, 2).map((m) => (
                        <span
                          key={m}
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--aubergine-soft)] text-[var(--primary)]"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </SurfaceCard>
            ))}
          </div>
        )}
      </div>

      {/* Rotating Vinyl Disc with Last Played Track */}
      <LastPlayedDisc />
    </div>
  );
}
