import React from "react";
import { usePlayer } from "../context/PlayerContext";
import { Play, Pause, SkipForward, Music } from "lucide-react";

export default function MiniPlayer({ onExpandHome }) {
  const { currentTrack, isPlaying, togglePlay, nextTrack, hasNext, progressPercent } =
    usePlayer();

  if (!currentTrack) return null;

  return (
    <div
      className="fixed bottom-[68px] sm:bottom-[82px] left-0 right-0 z-40 flex justify-center px-2 sm:px-4 pointer-events-none animate-fade-in"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="pointer-events-auto flex flex-col w-full max-w-[370px] sm:max-w-md rounded-2xl liquid-glass border border-[var(--glass-border)] shadow-xl overflow-hidden backdrop-blur-2xl">
        {/* Slim top progress track */}
        <div className="w-full h-[2.5px] bg-black/5 dark:bg-white/10">
          <div
            className="h-full bg-[var(--primary)] transition-all duration-100 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Content Row */}
        <div className="flex items-center justify-between p-2 sm:p-2.5 gap-2.5">
          {/* Left: Mini Spinning Vinyl + Track details */}
          <div
            onClick={onExpandHome}
            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
            title="View Turntable"
          >
            {/* Mini Vinyl */}
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full shrink-0 shadow-md bg-neutral-900 border border-neutral-800 flex items-center justify-center overflow-hidden">
              <div
                className={`w-full h-full rounded-full flex items-center justify-center ${
                  isPlaying ? "animate-spin" : ""
                }`}
                style={{ animationDuration: "6s" }}
              >
                {currentTrack.art ? (
                  <img
                    src={currentTrack.art}
                    alt={currentTrack.track}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-[var(--primary)] text-white text-[9px] font-bold flex items-center justify-center">
                    {(currentTrack.track || "♪").charAt(0)}
                  </div>
                )}
              </div>
              <div className="absolute w-2 h-2 rounded-full bg-[var(--paper)] pointer-events-none" />
            </div>

            {/* Title & Artist */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-fraunces text-xs sm:text-sm font-bold text-[var(--ink)] truncate group-hover:text-[var(--primary)] transition">
                  {currentTrack.track}
                </span>
                {isPlaying && (
                  <div className="eq-container text-[var(--primary)] shrink-0">
                    <span className="eq-bar eq-bar-1" />
                    <span className="eq-bar eq-bar-2" />
                    <span className="eq-bar eq-bar-3" />
                  </div>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-[var(--ink-soft)] truncate">
                {currentTrack.artist}
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={togglePlay}
              className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>

            {hasNext && (
              <button
                type="button"
                onClick={nextTrack}
                className="w-7 h-7 rounded-full bg-[var(--card-alt)] text-[var(--ink)] flex items-center justify-center hover:bg-[var(--primary)] hover:text-white transition active:scale-95"
                title="Next track"
              >
                <SkipForward className="w-3.5 h-3.5 fill-current" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
