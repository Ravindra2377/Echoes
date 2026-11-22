import React, { useEffect, useState, useRef } from "react";
import { Play, Pause, SkipBack, SkipForward, Repeat } from "lucide-react";
import "./LastPlayedDisc.css";

const SOURCES = {
  spotify: { name: "Spotify", color: "#1f9d55" },
  ytmusic: { name: "YT Music", color: "#e0453a" },
  yt: { name: "YT Music", color: "#e0453a" },
  amazon: { name: "Amazon Music", color: "#2e86c1" },
};

function timeAgo(iso) {
  if (!iso) return "";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

// Web Audio API ambient vinyl synth fallback
let audioCtx = null;
let synthGain = null;
let synthOscs = [];

function startSynthFallback() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === "suspended") audioCtx.resume();

    stopSynthFallback();

    const master = audioCtx.createGain();
    master.gain.setValueAtTime(0.06, audioCtx.currentTime);
    master.connect(audioCtx.destination);
    synthGain = master;

    // Warm dreamy lo-fi chord: Eb3, G3, Bb3, D4
    const notes = [155.56, 196.00, 233.08, 293.66];
    synthOscs = notes.map((f) => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, audioCtx.currentTime);
      g.gain.setValueAtTime(0.25, audioCtx.currentTime);
      osc.connect(g);
      g.connect(master);
      osc.start();
      return osc;
    });
  } catch (err) {
    console.warn("Synth fallback error:", err);
  }
}

function stopSynthFallback() {
  if (synthGain && audioCtx) {
    try {
      synthGain.gain.setValueAtTime(0, audioCtx.currentTime);
    } catch (_) {}
  }
  synthOscs.forEach((o) => {
    try {
      o.stop();
    } catch (_) {}
  });
  synthOscs = [];
  synthGain = null;
}

export default function LastPlayedDisc({
  track: givenTrack,
  playlist: givenPlaylist,
  endpoint = (typeof window !== "undefined" && window.location.port === "5173"
    ? "http://127.0.0.1:8000/api/last-played"
    : "/api/last-played"),
}) {
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);

  const audioRef = useRef(null);
  const progressTrackRef = useRef(null);

  // Initialize or fetch playlist & current song
  useEffect(() => {
    if (givenPlaylist && givenPlaylist.length > 0) {
      setPlaylist(givenPlaylist);
      setCurrentIndex(0);
      return;
    }

    if (givenTrack) {
      setPlaylist([givenTrack]);
      setCurrentIndex(0);
      return;
    }

    // Default: fetch /api/last-played and check that day's session
    let alive = true;
    const load = async () => {
      try {
        const last = await fetch(endpoint).then((r) => (r.ok ? r.json() : null));
        if (!alive || !last) return;

        // Check if there are other listens from the same day
        if (last.played_at) {
          const day = last.played_at.slice(0, 10);
          const dayData = await fetch(
            window.location.port === "5173"
              ? `http://127.0.0.1:8000/api/days/${day}`
              : `/api/days/${day}`
          ).then((r) => (r.ok ? r.json() : null));

          if (alive && dayData?.listens?.length > 1) {
            // Found a playlist of songs for this day
            const list = dayData.listens;
            setPlaylist(list);
            const idx = list.findIndex((item) => item.track === last.track);
            setCurrentIndex(idx >= 0 ? idx : list.length - 1);
            return;
          }
        }

        // Single track fallback
        if (alive) {
          setPlaylist([last]);
          setCurrentIndex(0);
        }
      } catch (err) {
        console.error("Failed to load turntable data:", err);
      }
    };

    load();
    const id = setInterval(load, 60000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [givenTrack, givenPlaylist, endpoint]);

  const currentTrack = playlist[currentIndex] || null;
  const isPlaylist = playlist.length > 1;
  const hasNext = isPlaylist && currentIndex < playlist.length - 1;
  const hasPrev = isPlaylist && currentIndex > 0;
  const nextTrack = hasNext ? playlist[currentIndex + 1] : null;

  const src = SOURCES[currentTrack?.source] || {
    name: currentTrack?.source || "",
    color: "#e0453a",
  };

  // Setup HTML5 Audio element
  useEffect(() => {
    const audio = new Audio();
    audio.volume = 0.75;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      if (isRepeating) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else if (isPlaylist && currentIndex < playlist.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setIsPlaying(false);
        setIsFinished(true);
        stopSynthFallback();
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audioRef.current = audio;

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
      stopSynthFallback();
      audioRef.current = null;
    };
  }, [isRepeating, isPlaylist, currentIndex, playlist.length]);

  // Load preview audio when currentTrack changes
  useEffect(() => {
    if (!currentTrack) return;
    setIsFinished(false);
    setCurrentTime(0);

    const loadAudio = async () => {
      let audioUrl = currentTrack.audio;

      // If audio URL not yet on the object, query /api/preview
      if (!audioUrl) {
        try {
          const previewEndpoint =
            window.location.port === "5173"
              ? "http://127.0.0.1:8000/api/preview"
              : "/api/preview";
          const res = await fetch(
            `${previewEndpoint}?track=${encodeURIComponent(
              currentTrack.track
            )}&artist=${encodeURIComponent(currentTrack.artist || "")}`
          ).then((r) => (r.ok ? r.json() : null));

          if (res?.audio) {
            audioUrl = res.audio;
            if (res.art && !currentTrack.art) {
              currentTrack.art = res.art;
            }
          }
        } catch (_) {}
      }

      if (audioRef.current) {
        if (audioUrl) {
          audioRef.current.src = audioUrl;
          if (isPlaying) {
            audioRef.current.play().catch(() => {
              startSynthFallback();
            });
          }
        } else if (isPlaying) {
          startSynthFallback();
        }
      }
    };

    loadAudio();
  }, [currentIndex, currentTrack?.track, currentTrack?.artist]);

  // Handle Play/Pause
  const handleTogglePlay = () => {
    const nextPlay = !isPlaying;
    setIsPlaying(nextPlay);
    setIsFinished(false);

    if (nextPlay) {
      if (audioRef.current?.src) {
        audioRef.current.play().catch(() => {
          startSynthFallback();
        });
      } else {
        startSynthFallback();
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      stopSynthFallback();
    }
  };

  // Next Track
  const handleNext = () => {
    if (hasNext) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  // Previous Track
  const handlePrev = () => {
    if (audioRef.current && audioRef.current.currentTime > 2) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    if (hasPrev) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Seek bar click
  const handleSeek = (e) => {
    if (!progressTrackRef.current || !duration) return;
    const rect = progressTrackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pos * duration;
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!currentTrack) {
    return (
      <section className="lpd">
        <div className="lpd-text lpd-empty">Nothing played yet. Press Sync.</div>
      </section>
    );
  }

  // Next upcoming tracks for stacked vinyl display (if in playlist mode)
  const stackedTracks = isPlaylist
    ? playlist.slice(currentIndex + 1, currentIndex + 4)
    : [];

  return (
    <section className="lpd" aria-label="Music turntable">
      {/* Vinyl Visual Presentation - Always Perfectly Centered */}
      <div className={`lpd-visual ${isPlaying ? "lpd-is-playing" : "lpd-is-paused"}`}>
        <div
          className="lpd-stage"
          onClick={handleTogglePlay}
          title={isPlaying ? "Click to stop" : "Click to play"}
        >
          {/* Ambient Turntable Soundwave Halo */}
          <div className="lpd-ambient-halo" />

          {/* Background Cascading Records (only when there are upcoming tracks) */}
          {stackedTracks.map((trk, i) => {
            const trkSrc = SOURCES[trk.source] || { color: "#8b5cf6" };
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

      {/* Pill Badge: "Up next..." or "Ends after this song" */}
      <div>
        {isPlaylist && nextTrack ? (
          <div
            className="lpd-pill"
            onClick={handleNext}
            title={`Skip to next: ${nextTrack.track}`}
          >
            <span
              className="lpd-pill-dot"
              style={{
                background: SOURCES[nextTrack.source]?.color || "#a855f7",
              }}
            />
            <span className="truncate">
              Up next <strong className="font-semibold">{nextTrack.track}</strong> · {nextTrack.artist}
            </span>
          </div>
        ) : (
          <div className="lpd-pill cursor-default">
            <span>{isRepeating ? "Repeating this song" : "Ends after this song"}</span>
          </div>
        )}
      </div>

      {/* Track Information (Fraunces & Instrument Sans) */}
      <div className="lpd-info">
        <div className="lpd-kicker">
          {isPlaying ? "Playing now" : isFinished ? "Finished" : "Last played"}
        </div>
        <h2 className="lpd-title">{currentTrack.track}</h2>
        <p className="lpd-artist">{currentTrack.artist}</p>
        <p className="lpd-subtitle">
          {isPlaylist
            ? `${currentTrack.album || "Queue"} · ${currentIndex + 1} of ${playlist.length}`
            : "Single song"}
          {isRepeating && " · repeating this song"}
        </p>
      </div>

      {/* Green Audio Progress Bar */}
      <div
        ref={progressTrackRef}
        className="lpd-progress-track"
        onClick={handleSeek}
        title="Seek position"
      >
        <div
          className="lpd-progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Transport Playback Controls Row */}
      <div className="lpd-controls">
        {/* Previous */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={!hasPrev && currentTime < 2}
          className="lpd-btn"
          title="Previous song"
        >
          <SkipBack className="w-4 h-4 fill-current" />
        </button>

        {/* Play / Pause */}
        <button
          type="button"
          onClick={handleTogglePlay}
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
          onClick={handleNext}
          disabled={!hasNext}
          className="lpd-btn"
          title="Next song"
        >
          <SkipForward className="w-4 h-4 fill-current" />
        </button>

        {/* Repeat Toggle */}
        <button
          type="button"
          onClick={() => setIsRepeating(!isRepeating)}
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
