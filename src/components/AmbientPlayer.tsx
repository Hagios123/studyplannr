import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, Music, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";

interface Track {
  id: string;
  label: string;
  emoji: string;
  url: string;
}

const AMBIENT_TRACKS: Track[] = [
  {
    id: "lofi",
    label: "Lo-Fi Beats",
    emoji: "🎵",
    url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
  },
  {
    id: "rain",
    label: "Rain Sounds",
    emoji: "🌧️",
    url: "https://cdn.pixabay.com/audio/2022/09/06/audio_80265eed33.mp3",
  },
  {
    id: "cafe",
    label: "Café Ambience",
    emoji: "☕",
    url: "https://cdn.pixabay.com/audio/2024/11/04/audio_af36e1f77b.mp3",
  },
  {
    id: "nature",
    label: "Forest & Birds",
    emoji: "🌲",
    url: "https://cdn.pixabay.com/audio/2022/03/09/audio_c8afbab4b2.mp3",
  },
  {
    id: "whitenoise",
    label: "White Noise",
    emoji: "📡",
    url: "https://cdn.pixabay.com/audio/2024/09/26/audio_7e0deb4a5e.mp3",
  },
];

export function AmbientPlayer() {
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const [volume, setVolume] = useState(50);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playTrack = (trackId: string) => {
    const track = AMBIENT_TRACKS.find((t) => t.id === trackId);
    if (!track) return;

    if (playing === trackId) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlaying(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(track.url);
    audio.loop = true;
    audio.volume = volume / 100;
    audio.play().catch(() => {});
    audioRef.current = audio;
    setPlaying(trackId);
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const currentTrack = AMBIENT_TRACKS.find((t) => t.id === playing);

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 z-50">
      <AnimatePresence mode="wait">
        {expanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="bg-card border border-border rounded-2xl shadow-lg p-4 w-[220px]"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Study Sounds
                </span>
              </div>
              <button onClick={() => setExpanded(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5 mb-3">
              {AMBIENT_TRACKS.map((track) => (
                <button
                  key={track.id}
                  onClick={() => playTrack(track.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    playing === track.id
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent"
                  }`}
                >
                  <span className="text-sm">{track.emoji}</span>
                  <span className="flex-1 text-left">{track.label}</span>
                  {playing === track.id && (
                    <div className="flex gap-0.5">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="w-0.5 bg-primary rounded-full animate-pulse"
                          style={{
                            height: `${8 + Math.random() * 8}px`,
                            animationDelay: `${i * 0.15}s`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 px-1">
              <VolumeX className="w-3 h-3 text-muted-foreground shrink-0" />
              <Slider
                value={[volume]}
                onValueChange={(v) => setVolume(v[0])}
                max={100}
                step={1}
                className="flex-1"
              />
              <Volume2 className="w-3 h-3 text-muted-foreground shrink-0" />
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="collapsed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => setExpanded(true)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border shadow-lg transition-all ${
              playing
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-card border-border text-foreground hover:border-primary/30"
            }`}
          >
            <Music className="w-4 h-4" />
            {playing && currentTrack ? (
              <span className="text-xs font-medium">{currentTrack.emoji} {currentTrack.label}</span>
            ) : (
              <span className="text-xs font-medium">Sounds</span>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
