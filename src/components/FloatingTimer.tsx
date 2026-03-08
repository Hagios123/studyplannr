import { useState, useEffect, useRef } from "react";
import { Timer, Play, Pause, RotateCcw, Coffee, X, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStudyStore } from "@/stores/useStudyStore";
import { motion, AnimatePresence } from "framer-motion";

type Phase = "focus" | "break";

export function FloatingTimer() {
  const [expanded, setExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [phase, setPhase] = useState<Phase>("focus");
  const [focusMinutes, setFocusMinutes] = useState(() => {
    const saved = localStorage.getItem("studyai_focus_mins");
    return saved ? parseInt(saved) : 25;
  });
  const [breakMinutes, setBreakMinutes] = useState(() => {
    const saved = localStorage.getItem("studyai_break_mins");
    return saved ? parseInt(saved) : 5;
  });
  const [seconds, setSeconds] = useState(focusMinutes * 60);
  const [running, setRunning] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const { addSession, subjects } = useStudyStore();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const focusDuration = focusMinutes * 60;
  const breakDuration = breakMinutes * 60;

  const reset = () => {
    setRunning(false);
    setSeconds(phase === "focus" ? focusDuration : breakDuration);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const saveDurations = (focus: number, brk: number) => {
    setFocusMinutes(focus);
    setBreakMinutes(brk);
    localStorage.setItem("studyai_focus_mins", String(focus));
    localStorage.setItem("studyai_break_mins", String(brk));
    if (!running) {
      setSeconds(phase === "focus" ? focus * 60 : brk * 60);
    }
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
              duration: focusMinutes,
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
  }, [running, phase, addSession, subjects, focusDuration, breakDuration, focusMinutes]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const progress = phase === "focus"
    ? ((focusDuration - seconds) / focusDuration) * 100
    : ((breakDuration - seconds) / breakDuration) * 100;

  return (
    <div className="fixed top-4 right-4 z-50">
      <AnimatePresence mode="wait">
        {expanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="bg-card border border-border rounded-2xl shadow-lg p-4 w-[240px]"
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
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  aria-label="Timer settings"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setExpanded(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1 bg-border rounded-full mb-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${phase === "focus" ? "bg-primary" : "bg-accent"}`}
                style={{ width: `${progress}%` }}
              />
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

            {/* Settings panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 border-t border-border space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-muted-foreground w-12">Focus</label>
                      <Input
                        type="number"
                        min={1}
                        max={120}
                        value={focusMinutes}
                        onChange={(e) => saveDurations(Math.max(1, Math.min(120, parseInt(e.target.value) || 1)), breakMinutes)}
                        className="h-7 text-xs"
                      />
                      <span className="text-[10px] text-muted-foreground">min</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-muted-foreground w-12">Break</label>
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={breakMinutes}
                        onChange={(e) => saveDurations(focusMinutes, Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                        className="h-7 text-xs"
                      />
                      <span className="text-[10px] text-muted-foreground">min</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-center gap-1.5 mt-2">
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
