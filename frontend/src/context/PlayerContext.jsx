import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { api } from "../config/api";

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
  const pendingVideoIdRef = useRef(null);

  // Active state mirrors to prevent stale closures in timers and callbacks
  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;

  const playModeRef = useRef("youtube");
  playModeRef.current = playMode;

  const isRepeatingRef = useRef(false);
  isRepeatingRef.current = isRepeating;

  const playlistRef = useRef([]);
  playlistRef.current = playlist;

  const currentIndexRef = useRef(0);
  currentIndexRef.current = currentIndex;

  const currentTrackRef = useRef(null);
  currentTrackRef.current = currentTrack;

  const currentTimeRef = useRef(0);
  currentTimeRef.current = currentTime;

  const durationRef = useRef(210);
  durationRef.current = duration;

  const handleNextTrackRef = useRef(null);

  // Next Track Logic
  const handleNextTrack = useCallback(() => {
    const q = playlistRef.current;
    const curIdx = currentIndexRef.current;
    if (q.length > 0 && curIdx < q.length - 1) {
      const nextIdx = curIdx + 1;
      setCurrentIndex(nextIdx);
      currentIndexRef.current = nextIdx;
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
        isPlayingRef.current = false;
        setCurrentTime(0);
        currentTimeRef.current = 0;
      }
    }
  }, []);
  handleNextTrackRef.current = handleNextTrack;

  // Previous Track Logic
  const handlePrevTrack = useCallback(() => {
    if (currentTimeRef.current > 4) {
      seek(0);
      return;
    }
    const q = playlistRef.current;
    const curIdx = currentIndexRef.current;
    if (q.length > 0 && curIdx > 0) {
      const prevIdx = curIdx - 1;
      setCurrentIndex(prevIdx);
      currentIndexRef.current = prevIdx;
      playTrack(q[prevIdx], q);
    } else {
      seek(0);
    }
  }, []);

  // 1. Initialize HTML5 Audio and YouTube IFrame Player
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";

    audio.ontimeupdate = () => {
      if (playModeRef.current === "html5") {
        const cur = audio.currentTime;
        setCurrentTime(cur);
        currentTimeRef.current = cur;
        if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
          setDuration(audio.duration);
          durationRef.current = audio.duration;
        }
      }
    };

    audio.onended = () => {
      if (isRepeatingRef.current) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else if (handleNextTrackRef.current) {
        handleNextTrackRef.current();
      }
    };

    audio.onerror = () => {
      console.warn("HTML5 audio playback error; using synth fallback");
      setPlayMode("synth");
      playModeRef.current = "synth";
      startSynthEngine();
    };

    audioRef.current = audio;

    // Initialize YouTube Player
    initYouTubePlayer();

    // Load initial track from diary
    loadInitialTrack();

    // High-precision position polling timer for in-app audio playback
    const timer = setInterval(() => {
      if (!isPlayingRef.current) return;

      const mode = playModeRef.current;

      if (mode === "youtube") {
        if (ytPlayerRef.current && ytReadyRef.current) {
          try {
            const cur = ytPlayerRef.current.getCurrentTime();
            const dur = ytPlayerRef.current.getDuration();
            if (typeof cur === "number" && !isNaN(cur) && cur >= 0) {
              setCurrentTime(cur);
              currentTimeRef.current = cur;
            }
            if (typeof dur === "number" && !isNaN(dur) && dur > 0) {
              setDuration(dur);
              durationRef.current = dur;
            }
          } catch (_) {}
        }
      } else if (mode === "html5") {
        if (audioRef.current && !audioRef.current.paused) {
          const cur = audioRef.current.currentTime;
          const dur = audioRef.current.duration;
          if (typeof cur === "number" && !isNaN(cur)) {
            setCurrentTime(cur);
            currentTimeRef.current = cur;
          }
          if (typeof dur === "number" && !isNaN(dur) && dur > 0) {
            setDuration(dur);
            durationRef.current = dur;
          }
        }
      } else if (mode === "synth") {
        setCurrentTime((prev) => {
          const next = prev + 0.25;
          currentTimeRef.current = next;
          const targetDur = durationRef.current || 210;
          if (next >= targetDur) {
            if (handleNextTrackRef.current) {
              handleNextTrackRef.current();
            }
            return 0;
          }
          return next;
        });
      }
    }, 250);

    return () => {
      audio.pause();
      stopSynthEngine();
      clearInterval(timer);
    };
  }, []);

  const initYouTubePlayer = () => {
    const createPlayer = () => {
      try {
        if (!window.YT || !window.YT.Player) return;
        if (ytPlayerRef.current) return;

        ytPlayerRef.current = new window.YT.Player("echoes-yt-player", {
          height: "150",
          width: "200",
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              ytReadyRef.current = true;
              try {
                event.target.unMute();
                event.target.setVolume(100);
              } catch (_) {}

              // If a track was queued before YouTube finished ready handshake
              if (pendingVideoIdRef.current) {
                const vid = pendingVideoIdRef.current;
                pendingVideoIdRef.current = null;
                try {
                  setPlayMode("youtube");
                  playModeRef.current = "youtube";
                  event.target.loadVideoById(vid);
                  event.target.unMute();
                  event.target.setVolume(100);
                  event.target.playVideo();
                  setIsPlaying(true);
                  isPlayingRef.current = true;
                } catch (err) {
                  console.warn("Pending video playback issue:", err);
                }
              }
            },
            onStateChange: (event) => {
              // 1 = PLAYING, 2 = PAUSED, 0 = ENDED, 3 = BUFFERING
              if (event.data === 1) {
                setIsPlaying(true);
                isPlayingRef.current = true;
                stopSynthEngine();
              } else if (event.data === 2) {
                setIsPlaying(false);
                isPlayingRef.current = false;
              } else if (event.data === 0) {
                if (isRepeatingRef.current) {
                  try {
                    ytPlayerRef.current.seekTo(0, true);
                    ytPlayerRef.current.playVideo();
                  } catch (_) {}
                } else if (handleNextTrackRef.current) {
                  handleNextTrackRef.current();
                }
              }
            },
            onError: (err) => {
              console.warn("YouTube Player error:", err);
              // Fallback to HTML5 audio preview or synth
              if (currentTrackRef.current?.audio && audioRef.current) {
                setPlayMode("html5");
                playModeRef.current = "html5";
                audioRef.current.src = currentTrackRef.current.audio;
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(() => {
                  setPlayMode("synth");
                  playModeRef.current = "synth";
                  startSynthEngine();
                });
              } else {
                setPlayMode("synth");
                playModeRef.current = "synth";
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
        currentTrackRef.current = last;
        setPlaylist([last]);
        playlistRef.current = [last];
        setCurrentIndex(0);
        currentIndexRef.current = 0;
        const d = last.duration || last.dur;
        if (d) {
          setDuration(d);
          durationRef.current = d;
        }
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
    let newQueue = queue || playlistRef.current;
    if (!newQueue || newQueue.length === 0) {
      newQueue = [track];
    } else {
      const exists = newQueue.some((t) => t.track === track.track && t.artist === track.artist);
      if (!exists) {
        newQueue = [track, ...newQueue];
      }
    }
    setPlaylist(newQueue);
    playlistRef.current = newQueue;

    const idx = newQueue.findIndex(
      (t) => t.track === track.track && t.artist === track.artist
    );
    const activeIndex = idx >= 0 ? idx : 0;
    setCurrentIndex(activeIndex);
    currentIndexRef.current = activeIndex;

    // 2. Set current track
    let fullTrack = { ...track };
    setCurrentTrack(fullTrack);
    currentTrackRef.current = fullTrack;
    setCurrentTime(0);
    currentTimeRef.current = 0;

    // 3. Resolve Full Song Stream (YouTube videoId & true duration)
    let videoId = fullTrack.videoId;
    let fullDuration = fullTrack.duration || fullTrack.dur || 210;

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
        if (streamData?.audio && !fullTrack.audio) {
          fullTrack.audio = streamData.audio;
        }
        setCurrentTrack({ ...fullTrack });
        currentTrackRef.current = { ...fullTrack };
      } catch (err) {
        console.warn("Stream lookup notice:", err);
      }
    }

    setDuration(fullDuration);
    durationRef.current = fullDuration;

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
    if (videoId) {
      if (ytPlayerRef.current && ytReadyRef.current) {
        try {
          setPlayMode("youtube");
          playModeRef.current = "youtube";
          ytPlayerRef.current.loadVideoById(videoId);
          ytPlayerRef.current.unMute();
          ytPlayerRef.current.setVolume(100);
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
          isPlayingRef.current = true;
          return;
        } catch (err) {
          console.warn("YouTube play invocation issue:", err);
        }
      } else {
        // Player is loading: queue video for instant playback on ready
        pendingVideoIdRef.current = videoId;
        setPlayMode("youtube");
        playModeRef.current = "youtube";
        setIsPlaying(true);
        isPlayingRef.current = true;
        return;
      }
    }

    // 6. Fallback: HTML5 audio preview
    if (fullTrack.audio && audioRef.current) {
      setPlayMode("html5");
      playModeRef.current = "html5";
      try {
        audioRef.current.src = fullTrack.audio;
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
        setIsPlaying(true);
        isPlayingRef.current = true;
        return;
      } catch (err) {
        console.warn("HTML5 audio playback issue:", err);
      }
    }

    // 7. Ambient vinyl synth fallback
    setPlayMode("synth");
    playModeRef.current = "synth";
    startSynthEngine();
    setIsPlaying(true);
    isPlayingRef.current = true;
  };

  const togglePlay = async () => {
    if (isPlayingRef.current) {
      // Pause
      setIsPlaying(false);
      isPlayingRef.current = false;

      if (playModeRef.current === "youtube" && ytPlayerRef.current && ytReadyRef.current) {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch (_) {}
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      stopSynthEngine();
    } else {
      // Resume
      setIsPlaying(true);
      isPlayingRef.current = true;

      const track = currentTrackRef.current;
      if (!track) return;

      if (playModeRef.current === "youtube" && ytPlayerRef.current && ytReadyRef.current) {
        try {
          ytPlayerRef.current.playVideo();
          return;
        } catch (_) {}
      }
      if (playModeRef.current === "html5" && audioRef.current && audioRef.current.src) {
        try {
          await audioRef.current.play();
          return;
        } catch (_) {}
      }
      playTrack(track);
    }
  };

  const seek = (seconds) => {
    const targetDur = durationRef.current || duration || 210;
    const clampSec = Math.max(0, Math.min(seconds, targetDur));
    setCurrentTime(clampSec);
    currentTimeRef.current = clampSec;

    if (playModeRef.current === "youtube" && ytPlayerRef.current && ytReadyRef.current) {
      try {
        ytPlayerRef.current.seekTo(clampSec, true);
      } catch (_) {}
    } else if (audioRef.current && playModeRef.current === "html5") {
      audioRef.current.currentTime = clampSec;
    }
  };

  const seekPercent = (percent) => {
    const targetDur = durationRef.current || duration || 210;
    if (targetDur > 0) {
      const target = (percent / 100) * targetDur;
      seek(target);
    }
  };

  const toggleRepeat = () => {
    setIsRepeating((prev) => {
      const next = !prev;
      isRepeatingRef.current = next;
      return next;
    });
  };

  const hasNext = playlist.length > 0 && currentIndex < playlist.length - 1;
  const hasPrev = playlist.length > 0 && (currentIndex > 0 || currentTime > 4);
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

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

      {/* Headless In-App YouTube Full-Song Audio Engine */}
      <div
        id="echoes-yt-engine-container"
        style={{
          position: "fixed",
          bottom: "4px",
          right: "4px",
          width: "200px",
          height: "150px",
          opacity: 0.001,
          pointerEvents: "none",
          zIndex: -50,
          overflow: "hidden",
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
