import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import { api, fetchApi } from "../config/api";

const PlayerContext = createContext(null);

// Ambient Vinyl Synthesizer Fallback (for tracks without CDN preview)
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
  const [duration, setDuration] = useState(30);

  const audioRef = useRef(null);
  const isPlayingRef = useRef(false);
  const isRepeatingRef = useRef(false);
  const currentTrackRef = useRef(null);

  isPlayingRef.current = isPlaying;
  isRepeatingRef.current = isRepeating;
  currentTrackRef.current = currentTrack;

  // Initialize HTML5 Audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    audio.onloadedmetadata = () => {
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
      console.warn("HTML5 audio playback error; engaging vinyl synthesizer fallback");
      startSynthEngine();
    };

    audioRef.current = audio;

    // Load initial track from /api/last-played on mount
    loadInitialTrack();

    return () => {
      audio.pause();
      stopSynthEngine();
    };
  }, []);

  const loadInitialTrack = async () => {
    try {
      const last = await api.getLastPlayed();
      if (last && !currentTrackRef.current) {
        setCurrentTrack(last);
        setPlaylist([last]);
        setCurrentIndex(0);
        if (last.audio && audioRef.current) {
          audioRef.current.src = last.audio;
        }
      }
    } catch (err) {
      console.error("Failed to load initial last-played track:", err);
    }
  };

  // Play a track in the app and immediately log the listen into the user's diary
  const playTrack = async (track, queue = null) => {
    if (!track) return;

    stopSynthEngine();

    // 1. Determine playlist & index
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

    // 3. Automatically record this listen in the user's daily listening diary
    try {
      api.logListen({
        track: fullTrack.track,
        artist: fullTrack.artist,
        album: fullTrack.album || "",
        source: fullTrack.source || "spotify",
        ref: fullTrack.ref || "",
        dur: fullTrack.dur || 210,
      }).catch((err) => console.warn("Log listen notice:", err));
    } catch (_) {}

    // 4. Resolve audio & artwork if missing
    let audioUrl = fullTrack.audio;
    if (!audioUrl) {
      try {
        const preview = await fetchApi(
          `/api/preview?track=${encodeURIComponent(fullTrack.track)}&artist=${encodeURIComponent(
            fullTrack.artist || ""
          )}`
        );
        if (preview?.audio) {
          audioUrl = preview.audio;
          fullTrack.audio = preview.audio;
        }
        if (preview?.art && !fullTrack.art) {
          fullTrack.art = preview.art;
        }
        setCurrentTrack({ ...fullTrack });
      } catch (err) {
        console.warn("Preview fetch error:", err);
      }
    }

    // 5. Play audio in the app
    if (audioUrl && audioRef.current) {
      try {
        audioRef.current.src = audioUrl;
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.warn("Playback autoplay issue; switching to synth fallback:", err);
        startSynthEngine();
        setIsPlaying(true);
      }
    } else {
      startSynthEngine();
      setIsPlaying(true);
    }
  };

  const togglePlay = async () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      stopSynthEngine();
      setIsPlaying(false);
    } else {
      if (currentTrack) {
        if (audioRef.current && audioRef.current.src && audioRef.current.src !== window.location.href) {
          try {
            await audioRef.current.play();
            setIsPlaying(true);
          } catch (err) {
            startSynthEngine();
            setIsPlaying(true);
          }
        } else {
          playTrack(currentTrack);
        }
      }
    }
  };

  const seek = (seconds) => {
    if (audioRef.current && duration > 0) {
      const clampSec = Math.max(0, Math.min(seconds, duration));
      audioRef.current.currentTime = clampSec;
      setCurrentTime(clampSec);
    }
  };

  const seekPercent = (percent) => {
    if (duration > 0) {
      const target = (percent / 100) * duration;
      seek(target);
    }
  };

  const handleNextTrack = () => {
    if (playlist.length > 0 && currentIndex < playlist.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      playTrack(playlist[nextIdx], playlist);
    } else if (playlist.length > 0) {
      // Loop back to start or pause
      if (isRepeatingRef.current) {
        playTrack(playlist[0], playlist);
      } else {
        if (audioRef.current) audioRef.current.pause();
        stopSynthEngine();
        setIsPlaying(false);
        setCurrentTime(0);
      }
    }
  };

  const handlePrevTrack = () => {
    if (currentTime > 3) {
      seek(0);
      return;
    }
    if (playlist.length > 0 && currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      playTrack(playlist[prevIdx], playlist);
    } else {
      seek(0);
    }
  };

  const toggleRepeat = () => {
    setIsRepeating(!isRepeating);
  };

  const hasNext = playlist.length > 0 && currentIndex < playlist.length - 1;
  const hasPrev = playlist.length > 0 && (currentIndex > 0 || currentTime > 3);
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
