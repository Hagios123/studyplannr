import { useState, useEffect, useRef } from "react";
import { Timer, Play, Pause, RotateCcw, Coffee, X, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudyStore } from "@/stores/useStudyStore";
import { motion, AnimatePresence } from "framer-motion";

type Phase = "focus" | "break";

export function FloatingTimer() {
  const [expanded, setExpanded] = useState(false);
  const [phase, setPhase] = useState<Phase>("focus");
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const { addSession, subjects } = useStudyStore();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const focusDuration = 25 * 60;
  const breakDuration = 5 * 60;

  const reset = () => {
    setRunning(false);
    setSeconds(phase === "focus" ? focusDuration : breakDuration);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          setRunning(false);
          if (phase === "focus") {
            setPomodoroCount((c) => c + 1);
            addSession({
              id: `s-${Date.now()}`,
              date: new Date().toISOString().split("T")[0],
              subject: subjects[0] || "General",
              duration: 25,
              type: "pomodoro",
            });
            setPhase("break");
            return breakDuration;
          } else {
            setPhase("focus");
            return focusDuration;
          }
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, phase, addSession, subjects]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div className="fixed top-4 right-4 z-50">
      <AnimatePresence mode="wait">
        {expanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="bg-card border border-border rounded-2xl shadow-lg p-4 w-[220px]"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {phase === "focus" ? (
                  <Timer className="w-4 h-4 text-primary" />
                ) : (
                  <Coffee className="w-4 h-4 text-accent" />
                )}
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {phase === "focus" ? "Focus" : "Break"}
                </span>
              </div>
              <button onClick={() => setExpanded(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center mb-3">
              <span className={`text-3xl font-display font-bold tabular-nums ${running ? "text-primary" : ""}`}>
                {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
              </span>
            </div>

            <div className="flex items-center justify-center gap-2 mb-3">
              <Button size="icon" variant="outline" onClick={reset} className="w-8 h-8 rounded-full">
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon"
                onClick={() => setRunning(!running)}
                className={`w-10 h-10 rounded-full ${running ? "bg-destructive hover:bg-destructive/90" : ""}`}
              >
                {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </Button>
            </div>

            <div className="flex items-center justify-center gap-1.5">
              {Array.from({ length: Math.max(4, pomodoroCount + 1) }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i < pomodoroCount ? "bg-primary" : "bg-border"
                  }`}
                />
              ))}
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
              running
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-card border-border text-foreground hover:border-primary/30"
            }`}
          >
            <Timer className="w-4 h-4" />
            <span className="text-sm font-display font-bold tabular-nums">
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
