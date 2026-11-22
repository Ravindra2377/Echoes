import React, { useState, useEffect } from "react";
import { api } from "../config/api";
import { useAuth } from "../context/AuthContext";
import {
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  LogOut,
  Terminal,
  Disc,
} from "lucide-react";
import { SurfaceCard, PillBadge, AppButton } from "../components/SharedUI";

const PLATFORMS = [
  {
    id: "spotify",
    name: "Spotify",
    subtitle: "Official Web API • Exact timestamps",
    color: "#1DB954",
    badgeColor: "spotify",
    instructions: "python sync.py spotify",
    docsUrl: "https://developer.spotify.com/dashboard",
  },
  {
    id: "ytmusic",
    name: "YouTube Music",
    subtitle: "ytmusicapi • Session headers",
    color: "#FF0000",
    badgeColor: "ytmusic",
    instructions: "ytmusicapi browser",
    docsUrl: "https://music.youtube.com",
  },
  {
    id: "amazon",
    name: "Amazon Music",
    subtitle: "Playwright Headless • Session cookies",
    color: "#FF9900",
    badgeColor: "amazon",
    instructions: "python -m scrapers.amazon login",
    docsUrl: "https://music.amazon.in/recents",
  },
];

export default function AccountsScreen() {
  const { user, logout } = useAuth();
  const [syncLogs, setSyncLogs] = useState([]);
  const [syncingSource, setSyncingSource] = useState(null);
  const [syncReport, setSyncReport] = useState(null);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    loadSyncLogs();
  }, []);

  const loadSyncLogs = async () => {
    setLoadingLogs(true);
    try {
      const logs = await api.getSyncStatus();
      setSyncLogs(logs || []);
    } catch (err) {
      console.error("Failed to load sync logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSync = async (source = null) => {
    setSyncingSource(source || "all");
    setSyncReport(null);
    try {
      const res = await api.triggerSync(source, true);
      setSyncReport(res);
      await loadSyncLogs();
    } catch (err) {
      setSyncReport({ error: err.message || "Sync failed" });
    } finally {
      setSyncingSource(null);
    }
  };

  return (
    <div className="screen-container space-y-5 sm:space-y-6 animate-fade-in">
      {/* Title */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="heading-hero text-xl sm:text-2xl md:text-3xl text-[var(--ink)]">
          Accounts
        </h1>

        <AppButton
          label={syncingSource === "all" ? "Syncing..." : "Sync All"}
          icon={RefreshCw}
          onPress={() => handleSync(null)}
          loading={syncingSource === "all"}
          className="text-xs sm:text-sm py-1.5 sm:py-2 px-3 sm:px-4 shadow-sm"
        />
      </div>

      {/* Sync Status Banner */}
      {syncReport && (
        <div className="p-3.5 rounded-2xl bg-[var(--aubergine-soft)] border border-[var(--border)] text-xs">
          <div className="flex items-center gap-1.5 font-bold text-[var(--primary)] mb-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>Sync Complete</span>
          </div>
          <pre className="font-mono bg-black/5 dark:bg-white/5 p-2 rounded text-[11px] overflow-x-auto text-[var(--ink)]">
            {JSON.stringify(syncReport, null, 2)}
          </pre>
        </div>
      )}

      {/* Platform Cards */}
      <div className="grid gap-3">
        {PLATFORMS.map((platform) => {
          const isSyncingThis = syncingSource === platform.id;

          return (
            <SurfaceCard key={platform.id} className="p-4 transition hover:border-[var(--primary)]/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                    style={{ backgroundColor: platform.color }}
                  >
                    <Disc className="w-5 h-5 animate-[spin_12s_linear_infinite]" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-fraunces text-base font-bold text-[var(--ink)]">
                        {platform.name}
                      </h3>
                      <PillBadge color={platform.badgeColor}>Connected</PillBadge>
                    </div>
                    <p className="text-xs text-[var(--ink-soft)]">{platform.subtitle}</p>

                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--ink-faint)]">
                      <Terminal className="w-3 h-3 text-[var(--primary)]" />
                      <span className="font-mono text-[11px]">{platform.instructions}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <a
                    href={platform.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--card-alt)] text-[var(--ink-soft)] hover:text-[var(--primary)] transition"
                    title={`Open ${platform.name}`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <AppButton
                    variant="secondary"
                    icon={RefreshCw}
                    label={isSyncingThis ? "Syncing..." : "Sync"}
                    onPress={() => handleSync(platform.id)}
                    loading={isSyncingThis}
                    className="text-xs py-1.5 px-3"
                  />
                </div>
              </div>
            </SurfaceCard>
          );
        })}
      </div>

      {/* Sync Execution History */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--ink-soft)] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>Sync History</span>
          </span>
          <button
            onClick={loadSyncLogs}
            className="text-xs font-semibold text-[var(--primary)] hover:underline flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        <SurfaceCard className="p-0 overflow-hidden">
          {loadingLogs ? (
            <div className="p-6 text-center text-xs text-[var(--ink-soft)]">Loading...</div>
          ) : syncLogs.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--ink-soft)]">
              No sync log executions recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--card-alt)] text-[var(--ink-soft)] border-b border-[var(--border)]">
                  <tr>
                    <th className="py-2.5 px-3.5 font-semibold">Source</th>
                    <th className="py-2.5 px-3.5 font-semibold">Timestamp</th>
                    <th className="py-2.5 px-3.5 font-semibold">Added</th>
                    <th className="py-2.5 px-3.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {syncLogs.slice(0, 8).map((log) => (
                    <tr key={log.id} className="hover:bg-[var(--paper)] transition">
                      <td className="py-2.5 px-3.5 font-bold uppercase text-[11px] text-[var(--ink)]">
                        {log.source}
                      </td>
                      <td className="py-2.5 px-3.5 text-[var(--ink-soft)] font-mono text-[11px]">
                        {log.started_at ? log.started_at.replace("T", " ").replace("Z", "") : "—"}
                      </td>
                      <td className="py-2.5 px-3.5 font-semibold text-[var(--coriander)]">
                        +{log.added || 0}
                      </td>
                      <td className="py-2.5 px-3.5">
                        {log.error ? (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] text-[var(--tomato)] font-semibold truncate max-w-xs"
                            title={log.error}
                          >
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{log.error}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-[var(--coriander)] font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Success</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SurfaceCard>
      </div>

      {/* User Profile Card */}
      <SurfaceCard className="p-4 flex items-center justify-between gap-4">
        <div>
          <h4 className="font-fraunces text-sm font-bold text-[var(--ink)]">{user?.name}</h4>
          <p className="text-xs text-[var(--ink-soft)]">{user?.email}</p>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-500/20 text-red-500 hover:bg-red-500/10 text-xs font-semibold transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </SurfaceCard>
    </div>
  );
}
