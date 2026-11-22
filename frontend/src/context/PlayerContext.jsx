import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import { api, fetchApi } from "../config/api";

const PlayerContext = createContext(null);

// Ambient Vinyl Synthesizer Fallback (for offline or fallback playback)
let synthCtx = null;
let synthGain = null;
let synthOscs = [];

function startSynthEngine() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!synthCtx) synthCtx = new AudioContextClass();
    if (synthCtx.state === "suspended") synthCtx.resume();

    stopSynthEngine();

    const master = synthCtx.createGain();
    master.gain.setValueAtTime(0.06, synthCtx.currentTime);
    master.connect(synthCtx.destination);
    synthGain = master;

    // Warm dreamy lo-fi chord: Eb3, G3, Bb3, D4
    const notes = [155.56, 196.0, 233.08, 293.66];
    synthOscs = notes.map((f) => {
      const osc = synthCtx.createOscillator();
      const g = synthCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, synthCtx.currentTime);
      g.gain.setValueAtTime(0.25, synthCtx.currentTime);
      osc.connect(g);
      g.connect(master);
      osc.start();
      return osc;
    });
  } catch (err) {
    console.warn("Synth engine notice:", err);
  }
}

function stopSynthEngine() {
  if (synthGain && synthCtx) {
    try {
      synthGain.gain.setValueAtTime(0, synthCtx.currentTime);
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

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(210);

  // Playback mode: "youtube" | "html5" | "synth"
  const [playMode, setPlayMode] = useState("youtube");

  const audioRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const ytReadyRef = useRef(false);
  const timerRef = useRef(null);

  const isRepeatingRef = useRef(false);
  isRepeatingRef.current = isRepeating;

  const playlistRef = useRef([]);
  playlistRef.current = playlist;

  const currentIndexRef = useRef(0);
  currentIndexRef.current = currentIndex;

  const currentTrackRef = useRef(null);
  currentTrackRef.current = currentTrack;

  // 1. Initialize HTML5 Audio and YouTube IFrame Player
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";

    audio.ontimeupdate = () => {
      if (ytPlayerRef.current && ytReadyRef.current && playMode === "youtube") return;
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    audio.onended = () => {
      if (isRepeatingRef.current) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        handleNextTrack();
      }
    };

    audio.onerror = () => {
      console.warn("HTML5 audio playback error; using synth fallback");
      startSynthEngine();
    };

    audioRef.current = audio;

    // Initialize YouTube Player
    initYouTubePlayer();

    // Load initial track
    loadInitialTrack();

    // Real-time position polling timer for full-song YouTube playback
    timerRef.current = setInterval(() => {
      if (ytPlayerRef.current && ytReadyRef.current && isPlaying) {
        try {
          const t = ytPlayerRef.current.getCurrentTime();
          const d = ytPlayerRef.current.getDuration();
          if (typeof t === "number" && !isNaN(t)) {
            setCurrentTime(t);
          }
          if (typeof d === "number" && !isNaN(d) && d > 0) {
            setDuration(d);
          }
        } catch (_) {}
      }
    }, 250);

    return () => {
      audio.pause();
      stopSynthEngine();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const initYouTubePlayer = () => {
    const createPlayer = () => {
      try {
        if (!window.YT || !window.YT.Player) return;
        if (ytPlayerRef.current) return;

        ytPlayerRef.current = new window.YT.Player("echoes-yt-player", {
          height: "200",
          width: "200",
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
          },
          events: {
            onReady: () => {
              ytReadyRef.current = true;
            },
            onStateChange: (event) => {
              // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
              if (event.data === 1) {
                setIsPlaying(true);
                stopSynthEngine();
              } else if (event.data === 2) {
                setIsPlaying(false);
              } else if (event.data === 0) {
                if (isRepeatingRef.current) {
                  try {
                    ytPlayerRef.current.seekTo(0, true);
                    ytPlayerRef.current.playVideo();
                  } catch (_) {}
                } else {
                  handleNextTrack();
                }
              }
            },
            onError: (err) => {
              console.warn("YouTube Player error; falling back to preview/synth:", err);
              // Fallback to HTML5 audio or synth
              if (currentTrackRef.current?.audio && audioRef.current) {
                audioRef.current.src = currentTrackRef.current.audio;
                audioRef.current.play().catch(() => startSynthEngine());
              } else {
                startSynthEngine();
              }
            },
          },
        });
      } catch (err) {
        console.warn("Could not create YouTube Player:", err);
      }
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      window.onYouTubeIframeAPIReady = createPlayer;
    }
  };

  const loadInitialTrack = async () => {
    try {
      const last = await api.getLastPlayed();
      if (last && !currentTrackRef.current) {
        setCurrentTrack(last);
        setPlaylist([last]);
        setCurrentIndex(0);
        if (last.dur) setDuration(last.dur);
      }
    } catch (err) {
      console.error("Failed to load initial last-played track:", err);
    }
  };

  // Play a full song in the app and immediately record the listen in the daily diary
  const playTrack = async (track, queue = null) => {
    if (!track) return;

    stopSynthEngine();
    if (audioRef.current) {
      audioRef.current.pause();
    }

    // 1. Manage queue
    let newQueue = queue || playlist;
    if (!newQueue || newQueue.length === 0) {
      newQueue = [track];
    } else {
      const exists = newQueue.some((t) => t.track === track.track && t.artist === track.artist);
      if (!exists) {
        newQueue = [track, ...newQueue];
      }
    }
    setPlaylist(newQueue);

    const idx = newQueue.findIndex(
      (t) => t.track === track.track && t.artist === track.artist
    );
    setCurrentIndex(idx >= 0 ? idx : 0);

    // 2. Set current track
    let fullTrack = { ...track };
    setCurrentTrack(fullTrack);
    setCurrentTime(0);

    // 3. Resolve Full Song Stream (YouTube videoId & true duration)
    let videoId = fullTrack.videoId;
    let fullDuration = fullTrack.dur || 210;

    if (!videoId) {
      try {
        const streamData = await api.getStream(fullTrack.track, fullTrack.artist || "");
        if (streamData?.videoId) {
          videoId = streamData.videoId;
          fullTrack.videoId = streamData.videoId;
        }
        if (streamData?.duration) {
          fullDuration = streamData.duration;
          fullTrack.dur = streamData.duration;
        }
        if (streamData?.art && !fullTrack.art) {
          fullTrack.art = streamData.art;
        }
        setCurrentTrack({ ...fullTrack });
      } catch (err) {
        console.warn("Stream lookup notice:", err);
      }
    }

    setDuration(fullDuration);

    // 4. Automatically record this listen in the user's daily listening diary
    try {
      api.logListen({
        track: fullTrack.track,
        artist: fullTrack.artist,
        album: fullTrack.album || "",
        source: fullTrack.source || "catalog",
        ref: fullTrack.ref || "",
        dur: fullDuration,
      }).catch((err) => console.warn("Log listen notice:", err));
    } catch (_) {}

    // 5. Play FULL song via YouTube Player
    if (videoId && ytPlayerRef.current && ytReadyRef.current) {
      try {
        setPlayMode("youtube");
        ytPlayerRef.current.loadVideoById(videoId);
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
        return;
      } catch (err) {
        console.warn("YouTube play invocation issue:", err);
      }
    }

    // 6. Fallback: HTML5 audio or warm synth engine
    if (fullTrack.audio && audioRef.current) {
      setPlayMode("html5");
      try {
        audioRef.current.src = fullTrack.audio;
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
        setIsPlaying(true);
        return;
      } catch (err) {
        console.warn("HTML5 audio autoplay issue:", err);
      }
    }

    // 7. Ambient vinyl synth fallback
    setPlayMode("synth");
    startSynthEngine();
    setIsPlaying(true);
  };

  const togglePlay = async () => {
    if (isPlaying) {
      // Pause
      if (ytPlayerRef.current && ytReadyRef.current && playMode === "youtube") {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch (_) {}
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      stopSynthEngine();
      setIsPlaying(false);
    } else {
      // Resume
      if (currentTrack) {
        if (currentTrack.videoId && ytPlayerRef.current && ytReadyRef.current) {
          try {
            ytPlayerRef.current.playVideo();
            setIsPlaying(true);
            return;
          } catch (_) {}
        }
        if (audioRef.current && audioRef.current.src && audioRef.current.src !== window.location.href) {
          try {
            await audioRef.current.play();
            setIsPlaying(true);
            return;
          } catch (_) {}
        }
        playTrack(currentTrack);
      }
    }
  };

  const seek = (seconds) => {
    const clampSec = Math.max(0, Math.min(seconds, duration));
    setCurrentTime(clampSec);

    if (ytPlayerRef.current && ytReadyRef.current && playMode === "youtube") {
      try {
        ytPlayerRef.current.seekTo(clampSec, true);
      } catch (_) {}
    } else if (audioRef.current) {
      audioRef.current.currentTime = clampSec;
    }
  };

  const seekPercent = (percent) => {
    if (duration > 0) {
      const target = (percent / 100) * duration;
      seek(target);
    }
  };

  const handleNextTrack = () => {
    const q = playlistRef.current;
    const curIdx = currentIndexRef.current;
    if (q.length > 0 && curIdx < q.length - 1) {
      const nextIdx = curIdx + 1;
      setCurrentIndex(nextIdx);
      playTrack(q[nextIdx], q);
    } else if (q.length > 0) {
      if (isRepeatingRef.current) {
        playTrack(q[0], q);
      } else {
        if (ytPlayerRef.current && ytReadyRef.current) {
          try {
            ytPlayerRef.current.pauseVideo();
          } catch (_) {}
        }
        if (audioRef.current) audioRef.current.pause();
        stopSynthEngine();
        setIsPlaying(false);
        setCurrentTime(0);
      }
    }
  };

  const handlePrevTrack = () => {
    if (currentTime > 4) {
      seek(0);
      return;
    }
    const q = playlistRef.current;
    const curIdx = currentIndexRef.current;
    if (q.length > 0 && curIdx > 0) {
      const prevIdx = curIdx - 1;
      setCurrentIndex(prevIdx);
      playTrack(q[prevIdx], q);
    } else {
      seek(0);
    }
  };

  const toggleRepeat = () => {
    setIsRepeating(!isRepeating);
  };

  const hasNext = playlist.length > 0 && currentIndex < playlist.length - 1;
  const hasPrev = playlist.length > 0 && (currentIndex > 0 || currentTime > 4);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        playlist,
        currentIndex,
        isPlaying,
        isRepeating,
        currentTime,
        duration,
        progressPercent,
        hasNext,
        hasPrev,
        playTrack,
        togglePlay,
        seek,
        seekPercent,
        nextTrack: handleNextTrack,
        prevTrack: handlePrevTrack,
        toggleRepeat,
      }}
    >
      {children}

      {/* Hidden In-App YouTube Full-Song Audio Engine */}
      <div
        id="echoes-yt-engine-container"
        style={{
          position: "fixed",
          top: "-2000px",
          left: "-2000px",
          width: "200px",
          height: "200px",
          opacity: 0.001,
          pointerEvents: "none",
          zIndex: -9999,
        }}
      >
        <div id="echoes-yt-player" />
      </div>
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return ctx;
}
