import { useMemo } from "react";
import { useStudyStore } from "@/stores/useStudyStore";
import { useGamificationStore } from "@/stores/useGamificationStore";
import { Zap, Check, Clock, Flame, BookOpen, Brain, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: any;
  xpReward: number;
  target: number;
  getCurrent: () => number;
  color: string;
}

function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
}

export default function WeeklyChallenges() {
  const { tasks, sessions } = useStudyStore();
  const { totalXP, getStreak } = useGamificationStore();

  const weekNum = getWeekNumber();
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const thisWeekTasks = tasks.filter((t) => t.date >= weekStartStr);
  const thisWeekCompleted = thisWeekTasks.filter((t) => t.status === "completed");
  const thisWeekMinutes = thisWeekCompleted.reduce((a, t) => a + t.duration, 0) +
    sessions.filter((s) => s.date >= weekStartStr).reduce((a, s) => a + s.duration, 0);
  const thisWeekSubjects = new Set(thisWeekCompleted.map((t) => t.subject));

  // Rotate challenges based on week number
  const allChallenges: Challenge[] = useMemo(() => [
    {
      id: "study-5h",
      title: "Study Marathon",
      description: "Study for 5 hours this week",
      icon: Clock,
      xpReward: 50,
      target: 300,
      getCurrent: () => thisWeekMinutes,
      color: "text-primary",
    },
    {
      id: "complete-10",
      title: "Task Crusher",
      description: "Complete 10 tasks this week",
      icon: Check,
      xpReward: 40,
      target: 10,
      getCurrent: () => thisWeekCompleted.length,
      color: "text-success",
    },
    {
      id: "streak-5",
      title: "Consistency King",
      description: "Maintain a 5-day streak",
      icon: Flame,
      xpReward: 60,
      target: 5,
      getCurrent: () => getStreak(),
      color: "text-accent",
    },
    {
      id: "subjects-3",
      title: "Well Rounded",
      description: "Study 3 different subjects",
      icon: BookOpen,
      xpReward: 35,
      target: 3,
      getCurrent: () => thisWeekSubjects.size,
      color: "text-chart-4",
    },
    {
      id: "study-10h",
      title: "Grind Mode",
      description: "Study for 10 hours this week",
      icon: Brain,
      xpReward: 80,
      target: 600,
      getCurrent: () => thisWeekMinutes,
      color: "text-chart-5",
    },
    {
      id: "complete-20",
      title: "Overachiever",
      description: "Complete 20 tasks this week",
      icon: Target,
      xpReward: 75,
      target: 20,
      getCurrent: () => thisWeekCompleted.length,
      color: "text-primary",
    },
  ], [thisWeekMinutes, thisWeekCompleted.length, thisWeekSubjects.size, getStreak]);

  // Pick 3 challenges based on week number
  const activeChallenges = useMemo(() => {
    const indices = [
      weekNum % allChallenges.length,
      (weekNum + 2) % allChallenges.length,
      (weekNum + 4) % allChallenges.length,
    ];
    return indices.map((i) => allChallenges[i]);
  }, [weekNum, allChallenges]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-sm flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent" /> Weekly Challenges
        </h3>
        <span className="text-[10px] text-muted-foreground">Week {weekNum}</span>
      </div>
      <div className="space-y-2">
        {activeChallenges.map((challenge) => {
          const current = challenge.getCurrent();
          const pct = Math.min(100, Math.round((current / challenge.target) * 100));
          const isComplete = current >= challenge.target;
          const displayCurrent = challenge.target >= 60 ? `${Math.round(current / 60)}h` : current;
          const displayTarget = challenge.target >= 60 ? `${Math.round(challenge.target / 60)}h` : challenge.target;

          return (
            <div
              key={challenge.id}
              className={`p-3 rounded-xl border transition-all ${
                isComplete
                  ? "border-success/30 bg-success/5"
                  : "border-border bg-card hover:border-primary/20"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0`}>
                  <challenge.icon className={`w-4 h-4 ${isComplete ? "text-success" : challenge.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{challenge.title}</p>
                    {isComplete && <Check className="w-3.5 h-3.5 text-success shrink-0" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{challenge.description}</p>
                </div>
                <span className="text-xs font-semibold text-accent shrink-0">+{challenge.xpReward} XP</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={pct} className="h-1.5 flex-1" />
                <span className="text-[10px] text-muted-foreground font-medium shrink-0">
                  {displayCurrent}/{displayTarget}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
