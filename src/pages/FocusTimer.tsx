import { useState, useEffect, useCallback, useRef } from "react";
import { Timer as TimerIcon, Play, Pause, RotateCcw, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudyStore } from "@/stores/useStudyStore";

type Phase = "focus" | "break";

export default function FocusTimer() {
  const [phase, setPhase] = useState<Phase>("focus");
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const { addSession, subjects } = useStudyStore();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const focusDuration = 25 * 60;
  const breakDuration = 5 * 60;

  const reset = useCallback(() => {
    setRunning(false);
    setSeconds(phase === "focus" ? focusDuration : breakDuration);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [phase]);

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
              subject: subjects[0],
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
  const progress = phase === "focus"
    ? ((focusDuration - seconds) / focusDuration) * 100
    : ((breakDuration - seconds) / breakDuration) * 100;

  const circumference = 2 * Math.PI * 140;
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <TimerIcon className="w-6 h-6 text-primary" /> Focus Timer
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {phase === "focus" ? "Stay focused on your study session" : "Take a short break to recharge"}
        </p>
      </div>

      <div className="flex flex-col items-center gap-8">
        {/* Timer circle */}
        <div className="relative">
          <svg width="320" height="320" className="transform -rotate-90">
            <circle cx="160" cy="160" r="140" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
            <circle
              cx="160" cy="160" r="140" fill="none"
              stroke={phase === "focus" ? "hsl(var(--primary))" : "hsl(var(--accent))"}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`w-6 h-6 rounded-full mb-3 flex items-center justify-center ${
              phase === "focus" ? "bg-primary/20" : "bg-accent/20"
            }`}>
              {phase === "focus" ? (
                <TimerIcon className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Coffee className="w-3.5 h-3.5 text-accent" />
              )}
            </div>
            <span className="text-6xl font-display font-bold tabular-nums tracking-tight">
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </span>
            <span className="text-sm text-muted-foreground mt-2 uppercase tracking-wider font-medium">
              {phase === "focus" ? "Focus Time" : "Break Time"}
            </span>
          </div>
          {running && <div className={`absolute inset-0 rounded-full animate-timer-pulse pointer-events-none`} />}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <Button
            size="lg"
            variant="outline"
            onClick={reset}
            className="w-12 h-12 rounded-full p-0"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
          <Button
            size="lg"
            onClick={() => setRunning(!running)}
            className={`w-20 h-20 rounded-full text-lg font-display font-bold ${
              running ? "bg-destructive hover:bg-destructive/90" : ""
            }`}
          >
            {running ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
          </Button>
          <div className="w-12 h-12" /> {/* spacer */}
        </div>

        {/* Pomodoro count */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Sessions completed:</span>
          <div className="flex gap-1.5">
            {Array.from({ length: Math.max(4, pomodoroCount + 1) }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-all ${
                  i < pomodoroCount ? "bg-primary glow-primary" : "bg-border"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
