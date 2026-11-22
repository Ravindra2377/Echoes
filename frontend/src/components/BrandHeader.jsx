import React from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { Sun, Moon, Radio, Disc, LogOut } from "lucide-react";

export default function BrandHeader({ onSyncClick, isSyncing = false }) {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full bg-[var(--paper)]/90 backdrop-blur-md border-b border-[var(--border)] transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand Left */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white shadow-sm">
            <Disc className="w-4 h-4 animate-[spin_10s_linear_infinite]" />
          </div>
          <span className="font-fraunces text-2xl font-bold tracking-tight text-[var(--ink)]">
            Echoes
          </span>
        </div>

        {/* Actions Right */}
        <div className="flex items-center gap-2">
          {onSyncClick && (
            <button
              onClick={onSyncClick}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--aubergine-soft)] text-[var(--primary)] text-xs font-semibold hover:bg-[var(--primary)] hover:text-white transition duration-150 disabled:opacity-50"
              title="Sync sources"
            >
              <Radio className={`w-3.5 h-3.5 ${isSyncing ? "animate-pulse" : ""}`} />
              <span>{isSyncing ? "Syncing..." : "Sync"}</span>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--ink-soft)] hover:text-[var(--ink)] bg-[var(--card)] border border-[var(--border)] transition shadow-sm"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* User profile / Logout */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-[var(--border)]">
              <span className="text-xs font-medium text-[var(--ink)] hidden sm:inline max-w-[100px] truncate">
                {user.name}
              </span>
              <button
                onClick={logout}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--ink-faint)] hover:text-[var(--tomato)] transition"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
