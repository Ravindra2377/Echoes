import React, { useRef } from "react";
import { Play, Pause, SkipBack, SkipForward, Repeat } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import "./LastPlayedDisc.css";

const SOURCES = {
  spotify: { name: "Spotify", color: "#1f9d55" },
  ytmusic: { name: "YT Music", color: "#e0453a" },
  yt: { name: "YT Music", color: "#e0453a" },
  amazon: { name: "Amazon Music", color: "#2e86c1" },
  catalog: { name: "Catalog", color: "#16845B" },
};

export default function LastPlayedDisc() {
  const {
    currentTrack,
    playlist,
    currentIndex,
    isPlaying,
    isRepeating,
    progressPercent,
    hasNext,
    hasPrev,
    togglePlay,
    seekPercent,
    nextTrack,
    prevTrack,
    toggleRepeat,
  } = usePlayer();

  const progressTrackRef = useRef(null);

  const handleSeekClick = (e) => {
    if (!progressTrackRef.current) return;
    const rect = progressTrackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    seekPercent(pos);
  };

  if (!currentTrack) {
    return (
      <section className="lpd">
        <div className="lpd-text lpd-empty text-xs text-[var(--ink-soft)]">
          No track loaded yet. Search for a song to play!
        </div>
      </section>
    );
  }

  const src = SOURCES[currentTrack.source] || { name: "Music", color: "#16845B" };
  const isPlaylist = playlist.length > 1;
  const nextTrackItem = hasNext ? playlist[currentIndex + 1] : null;

  // Upcoming stacked records
  const stackedTracks = isPlaylist
    ? playlist.slice(currentIndex + 1, currentIndex + 4)
    : [];

  return (
    <section className="lpd" aria-label="Music turntable">
      {/* Vinyl Visual Presentation - Always Perfectly Centered */}
      <div className={`lpd-visual ${isPlaying ? "lpd-is-playing" : "lpd-is-paused"}`}>
        <div
          className="lpd-stage"
          onClick={togglePlay}
          title={isPlaying ? "Click to pause" : "Click to play"}
        >
          {/* Ambient Turntable Soundwave Halo */}
          <div className="lpd-ambient-halo" />

          {/* Background Cascading Records */}
          {stackedTracks.map((trk, i) => {
            const trkSrc = SOURCES[trk.source] || { color: "#16845B" };
            return (
              <div
                key={trk.id || trk.track + i}
                className={`lpd-disc lpd-disc-stacked lpd-disc-stacked-${i + 1}`}
              >
                <div
                  className="lpd-label"
                  style={{
                    backgroundImage: trk.art ? `url(${trk.art})` : undefined,
                    backgroundColor: trkSrc.color,
                  }}
                >
                  {!trk.art && <span>{(trk.track || "♪").trim().charAt(0)}</span>}
                  <i className="lpd-hole" />
                </div>
              </div>
            );
          })}

          {/* Active Centered Spinning Record */}
          <div className="lpd-disc lpd-disc-active">
            {/* Realistic Vinyl Conic Grooves Sheen */}
            <div className="lpd-disc-sheen" />

            {/* Repeat badge on top-right of active vinyl */}
            {isRepeating && (
              <div className="lpd-repeat-badge" title="Repeating this song">
                <Repeat className="w-3.5 h-3.5" />
              </div>
            )}

            {/* Center album label */}
            <div
              className="lpd-label"
              style={{
                backgroundImage: currentTrack.art
                  ? `url(${currentTrack.art})`
                  : undefined,
                backgroundColor: src.color,
              }}
            >
              {!currentTrack.art && (
                <span>{(currentTrack.track || "♪").trim().charAt(0)}</span>
              )}
              <i className="lpd-hole" />
            </div>
          </div>

          {/* Precision Tonearm on active record */}
          <div className="lpd-arm" aria-hidden="true">
            <svg viewBox="0 0 260 260">
              <defs>
                <linearGradient id="tonearmMetalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f8fafc" />
                  <stop offset="35%" stopColor="#cbd5e1" />
                  <stop offset="70%" stopColor="#94a3b8" />
                  <stop offset="100%" stopColor="#475569" />
                </linearGradient>
              </defs>

              <circle cx="236" cy="24" r="16" fill="#1e2430" stroke="#374151" strokeWidth="1.5" />
              <circle cx="236" cy="24" r="10" fill="url(#tonearmMetalGrad)" />
              <circle cx="236" cy="24" r="4.5" fill="#111827" />

              <g
                className={isPlaying ? "lpd-needle-flutter" : ""}
                style={{
                  transformOrigin: "236px 24px",
                  transform: isPlaying ? "rotate(0deg)" : "rotate(-45deg)",
                  transition: "transform 0.85s cubic-bezier(0.25, 1, 0.5, 1)",
                }}
              >
                <rect x="236" y="17" width="18" height="14" rx="3" fill="#374151" stroke="#1f2937" strokeWidth="1" transform="rotate(40 236 24)" />
                <line x1="236" y1="24" x2="192" y2="60" stroke="url(#tonearmMetalGrad)" strokeWidth="5" strokeLinecap="round" />
                <line x1="235" y1="23" x2="193" y2="59" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
                <g transform="translate(192, 60) rotate(-16)">
                  <rect x="-6" y="-2" width="13" height="22" rx="3" fill="#111827" stroke="#374151" strokeWidth="1" />
                  <path d="M 7 3 Q 13 5 14 11" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="-5" y1="12" x2="6" y2="12" stroke="#16845B" strokeWidth="2" />
                  <polygon points="-2.5,20 2.5,20 0,25" fill="#ef4444" />
                  <circle cx="0" cy="26" r="1.5" fill="#ffffff" stroke="#9ca3af" strokeWidth="0.5" />
                </g>
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* Pill Badge: "Up next..." or "Currently Playing" */}
      <div>
        {isPlaylist && nextTrackItem ? (
          <div
            className="lpd-pill"
            onClick={nextTrack}
            title={`Skip to next: ${nextTrackItem.track}`}
          >
            <span
              className="lpd-pill-dot"
              style={{
                background: SOURCES[nextTrackItem.source]?.color || "#16845B",
              }}
            />
            <span className="truncate">
              Up next <strong className="font-semibold">{nextTrackItem.track}</strong> · {nextTrackItem.artist}
            </span>
          </div>
        ) : (
          <div className="lpd-pill cursor-default">
            <span>{isRepeating ? "Repeating this song" : "Playing directly in Echoes"}</span>
          </div>
        )}
      </div>

      {/* Track Information */}
      <div className="lpd-info">
        <div className="lpd-kicker">
          {isPlaying ? "Playing now" : "Ready to play"}
        </div>
        <h2 className="lpd-title">{currentTrack.track}</h2>
        <p className="lpd-artist">{currentTrack.artist}</p>
        <p className="lpd-subtitle">
          {currentTrack.album ? currentTrack.album : "In-App Track"}
          {isPlaylist ? ` · ${currentIndex + 1} of ${playlist.length}` : ""}
          {isRepeating && " · repeating"}
        </p>
      </div>

      {/* Audio Progress Bar */}
      <div
        ref={progressTrackRef}
        className="lpd-progress-track"
        onClick={handleSeekClick}
        title="Seek position"
      >
        <div
          className="lpd-progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Transport Controls Row */}
      <div className="lpd-controls">
        {/* Previous */}
        <button
          type="button"
          onClick={prevTrack}
          disabled={!hasPrev}
          className="lpd-btn"
          title="Previous song"
        >
          <SkipBack className="w-4 h-4 fill-current" />
        </button>

        {/* Play / Pause */}
        <button
          type="button"
          onClick={togglePlay}
          className="lpd-btn lpd-btn-play"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>

        {/* Next */}
        <button
          type="button"
          onClick={nextTrack}
          disabled={!hasNext}
          className="lpd-btn"
          title="Next song"
        >
          <SkipForward className="w-4 h-4 fill-current" />
        </button>

        {/* Repeat Toggle */}
        <button
          type="button"
          onClick={toggleRepeat}
          className={`lpd-btn lpd-btn-repeat ${isRepeating ? "is-active" : ""}`}
          title={isRepeating ? "Repeat: On" : "Repeat: Off"}
        >
          <Repeat className="w-4 h-4" />
          {isRepeating && <span className="lpd-btn-repeat-dot" />}
        </button>
      </div>
    </section>
  );
}
