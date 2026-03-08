import { useState, useMemo, useEffect } from "react";
import { useStudyStore } from "@/stores/useStudyStore";
import { useGamificationStore } from "@/stores/useGamificationStore";
import { useAuth } from "@/hooks/useAuth";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  TrendingUp,
  BookOpen,
  Sparkles,
  ArrowRight,
  LogOut,
  Flame,
  Lightbulb,
  Download,
  Target,
  MessageSquareText,
  Trophy,
  Star,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Confetti } from "@/components/Confetti";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

const TIPS = [
  "Use the Pomodoro technique: 25 min focus, 5 min break. Your brain retains more with spaced intervals.",
  "Teaching a concept to someone else is one of the best ways to truly understand it.",
  "Review flashcards right before sleep — your brain consolidates memories during rest.",
  "Break large topics into smaller chunks. Micro-learning sessions are more effective.",
  "Active recall (testing yourself) beats passive re-reading every time.",
  "Interleave subjects instead of blocking — mixing topics improves long-term retention.",
  "Write summaries in your own words after each session to strengthen understanding.",
  "Stay hydrated! Even mild dehydration reduces cognitive performance by up to 25%.",
  "Use the AI Tutor to ask 'why' questions — deep understanding beats surface memorization.",
  "Set specific goals for each session: 'Learn X' beats 'Study for 1 hour'.",
  "Use ⌘K (Ctrl+K) to quickly search and navigate anywhere in the app!",
  "You can use keyboard shortcuts in Flashcards: ← → to navigate, Space to flip, M to master.",
];

function getDailyTip() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return TIPS[dayOfYear % TIPS.length];
}

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  variant = "default",
}: {
  icon: any;
  label: string;
  value: string;
  sublabel?: string;
  variant?: "default" | "primary" | "accent" | "success";
}) {
  const variants = {
    default: "bg-card border-border",
    primary: "bg-primary/5 border-primary/20 glow-primary",
    accent: "bg-accent/5 border-accent/20 glow-accent",
    success: "bg-success/5 border-success/20",
  };

  const iconVariants = {
    default: "text-muted-foreground",
    primary: "text-primary",
    accent: "text-accent",
    success: "text-success",
  };

  return (
    <div className={`rounded-xl border p-3 md:p-5 ${variants[variant]} transition-all duration-300 hover:scale-[1.02]`}>
      <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
        <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg bg-secondary flex items-center justify-center">
          <Icon className={`w-3.5 h-3.5 md:w-4.5 md:h-4.5 ${iconVariants[variant]}`} />
        </div>
        <span className="text-xs md:text-sm text-muted-foreground font-medium truncate">{label}</span>
      </div>
      <p className="text-xl md:text-3xl font-display font-bold">{value}</p>
      {sublabel && <p className="text-[10px] md:text-xs text-muted-foreground mt-1">{sublabel}</p>}
    </div>
  );
}

function StreakCard({ tasks }: { tasks: { date: string; status: string }[] }) {
  const streak = useMemo(() => {
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayTasks = tasks.filter((t) => t.date === dateStr);
      const hasCompleted = dayTasks.some((t) => t.status === "completed");
      if (i === 0 && dayTasks.length === 0) continue;
      if (hasCompleted) count++;
      else if (i > 0) break;
    }
    return count;
  }, [tasks]);

  return (
    <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 md:p-5 transition-all duration-300 hover:scale-[1.02]">
      <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
        <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg bg-secondary flex items-center justify-center">
          <Flame className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 text-accent" />
        </div>
        <span className="text-xs md:text-sm text-muted-foreground font-medium">Study Streak</span>
      </div>
      <p className="text-xl md:text-3xl font-display font-bold">{streak} {streak === 1 ? "day" : "days"}</p>
      <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
        {streak >= 7 ? "🔥 You're on fire!" : streak >= 3 ? "Keep it up!" : "Start your streak today!"}
      </p>
    </div>
  );
}

function DailyGoalProgress() {
  const { tasks, sessions, dailyGoal, setDailyGoal } = useStudyStore();
  const today = new Date().toISOString().split("T")[0];
  const todayMinutes = sessions.filter((s) => s.date === today).reduce((a, s) => a + s.duration, 0)
    + tasks.filter((t) => t.date === today && t.status === "completed").reduce((a, t) => a + t.duration, 0);
  const pct = dailyGoal.enabled ? Math.min(100, Math.round((todayMinutes / dailyGoal.targetMinutes) * 100)) : 0;

  if (!dailyGoal.enabled) {
    return (
      <button
        onClick={() => setDailyGoal({ enabled: true })}
        className="rounded-xl border border-dashed border-border p-3 md:p-5 text-center hover:border-primary/30 transition-all"
      >
        <Target className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">Set a daily goal</p>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 md:p-5 transition-all duration-300 hover:scale-[1.02]">
      <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
        <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg bg-secondary flex items-center justify-center">
          <Target className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 text-primary" />
        </div>
        <span className="text-xs md:text-sm text-muted-foreground font-medium">Daily Goal</span>
      </div>
      <p className="text-xl md:text-3xl font-display font-bold">{pct}%</p>
      <div className="w-full h-1.5 bg-border rounded-full mt-2 overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
        {Math.round(todayMinutes)}m / {dailyGoal.targetMinutes}m
      </p>
    </div>
  );
}

function QuickActionCard({
  icon: Icon,
  title,
  description,
  to,
  variant = "default",
}: {
  icon: any;
  title: string;
  description: string;
  to: string;
  variant?: "primary" | "accent" | "default";
}) {
  const bg = variant === "primary" ? "bg-primary/10 hover:bg-primary/15" : variant === "accent" ? "bg-accent/10 hover:bg-accent/15" : "bg-secondary hover:bg-secondary/80";
  const iconColor = variant === "primary" ? "text-primary" : variant === "accent" ? "text-accent" : "text-foreground";

  return (
    <Link to={to} className={`group flex items-center gap-4 p-4 rounded-xl ${bg} border border-border/50 transition-all duration-200`}>
      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
    </Link>
  );
}

const Index = () => {
  const { tasks, sessions, updateTaskStatus, exportSchedule } = useStudyStore();
  const { totalXP, getLevel, getLevelProgress, getStreak, addXP, recordStreak, incrementStat, checkAchievements } = useGamificationStore();
  const { profile, signOut } = useAuth();
  const { toast } = useToast();
  const [noteDialogTask, setNoteDialogTask] = useState<string | null>(null);
  const [completionNote, setCompletionNote] = useState("");
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  const level = getLevel();
  const levelProgress = getLevelProgress();
  const streak = getStreak();

  // Check achievements on mount and when XP changes
  useEffect(() => {
    const newAchievements = checkAchievements();
    if (newAchievements.length > 0) {
      setConfettiTrigger((c) => c + 1);
      toast({ title: "🏆 Achievement Unlocked!", description: `You unlocked ${newAchievements.length} new achievement(s)!` });
    }
  }, [totalXP]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : hour < 21 ? "Good evening" : "Good night";
  const today = new Date().toISOString().split("T")[0];
  const todaysTasks = tasks.filter((t) => t.date === today);
  const completedToday = todaysTasks.filter((t) => t.status === "completed").length;
  const pendingToday = todaysTasks.filter((t) => t.status === "pending").length;
  const totalMinutesToday = sessions
    .filter((s) => s.date === today)
    .reduce((acc, s) => acc + s.duration, 0);
  const totalHoursWeek = (sessions.reduce((acc, s) => acc + s.duration, 0) / 60).toFixed(1);

  const displayName = profile?.display_name || profile?.username || "Scholar";

  const handleQuickComplete = (taskId: string) => {
    setNoteDialogTask(taskId);
    setCompletionNote("");
  };

  const confirmComplete = () => {
    if (noteDialogTask) {
      updateTaskStatus(noteDialogTask, "completed", completionNote || undefined);
      // Award XP
      addXP("task_complete", "Completed a study task");
      incrementStat("tasksCompleted");
      recordStreak(today);

      const newCompleted = todaysTasks.filter((t) => t.status === "completed" || t.id === noteDialogTask).length;
      const totalPending = todaysTasks.filter((t) => t.status === "pending").length;
      if (newCompleted === todaysTasks.length || totalPending <= 1) {
        setConfettiTrigger((c) => c + 1);
        toast({ title: "🎉 All tasks complete!", description: "Amazing work today!" });
      } else {
        toast({ title: "Task completed! +15 XP", description: completionNote ? "Note saved." : undefined });
      }
    }
    setNoteDialogTask(null);
  };

  const handleExport = () => {
    const text = exportSchedule();
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `study-ai-schedule-${today}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Schedule exported!", description: "Downloaded as text file." });
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <Confetti trigger={confettiTrigger > 0} key={confettiTrigger} />

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">
            {greeting}, <span className="text-gradient-primary">{displayName}</span>
          </h1>
          <p className="text-muted-foreground text-sm md:text-base mt-1">
            {pendingToday > 0
              ? `You have ${pendingToday} task${pendingToday === 1 ? "" : "s"} remaining today.`
              : todaysTasks.length > 0
              ? "All tasks done for today! 🎉"
              : "No tasks scheduled. Head to the Planner to get started."}
          </p>
        </div>
        <div className="flex gap-2 self-start">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2 text-muted-foreground">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-2 text-muted-foreground">
            <LogOut className="w-4 h-4" /> Sign out
          </Button>
        </div>
      </div>

      {/* Daily Study Tip */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
        <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-primary mb-1">Daily Study Tip</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{getDailyTip()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4">
        <StatCard icon={CalendarDays} label="Today's Tasks" value={`${completedToday}/${todaysTasks.length}`} sublabel="tasks completed" variant="primary" />
        <StatCard icon={Clock} label="Study Time" value={`${Math.round(totalMinutesToday / 60)}h ${totalMinutesToday % 60}m`} sublabel="today" variant="default" />
        <StatCard icon={TrendingUp} label="Weekly Hours" value={`${totalHoursWeek}h`} sublabel="this week" variant="accent" />
        <StatCard icon={CheckCircle2} label="Completion" value={`${tasks.length > 0 ? Math.round((tasks.filter((t) => t.status === "completed").length / tasks.length) * 100) : 0}%`} sublabel="overall" variant="success" />
        <StreakCard tasks={tasks} />
        <DailyGoalProgress />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
        <div className="lg:col-span-3 space-y-4">
          <h2 className="font-display font-semibold text-lg flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Today's Schedule
          </h2>
          <div className="space-y-2">
            {todaysTasks.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">No tasks scheduled for today. Go to Planner to add some!</p>
            )}
            {todaysTasks
              .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
              .map((task) => (
              <div
                key={task.id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 group ${
                  task.status === "completed"
                    ? "bg-success/5 border-success/20 opacity-70"
                    : "bg-card border-border hover:border-primary/30"
                }`}
              >
                {/* Quick complete button */}
                {task.status === "pending" ? (
                  <button
                    onClick={() => handleQuickComplete(task.id)}
                    className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 hover:border-primary hover:bg-primary/10 transition-all shrink-0"
                    aria-label={`Complete ${task.topic}`}
                  />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                )}
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  task.priority === "high" ? "bg-destructive" : task.priority === "medium" ? "bg-accent" : "bg-muted-foreground"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                    {task.topic}
                  </p>
                  <p className="text-xs text-muted-foreground">{task.subject} · {task.timeSlot} · {task.duration}min</p>
                  {task.completionNote && (
                    <p className="text-xs text-primary/70 mt-1 flex items-center gap-1">
                      <MessageSquareText className="w-3 h-3" /> {task.completionNote}
                    </p>
                  )}
                </div>
                {task.status === "pending" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                    onClick={() => updateTaskStatus(task.id, "skipped")}
                  >
                    Skip
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-display font-semibold text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            Quick Actions
          </h2>
          <div className="space-y-2">
            <QuickActionCard icon={BookOpen} title="Study Planner" description="Plan your sessions" to="/planner" variant="primary" />
            <QuickActionCard icon={Sparkles} title="Ask AI Tutor" description="Get help with any topic" to="/tutor" variant="accent" />
            <QuickActionCard icon={CheckCircle2} title="Review Flashcards" description={`${useStudyStore.getState().flashcards.filter((f) => !f.mastered && (f.id.startsWith("ai-") || f.id.startsWith("sched-"))).length} cards to review`} to="/flashcards" />
            <QuickActionCard icon={TrendingUp} title="View Analytics" description="Track your progress" to="/analytics" />
          </div>

          {/* Keyboard shortcut hint */}
          <div className="hidden md:flex items-center gap-2 text-[10px] text-muted-foreground px-2">
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-secondary text-[10px]">⌘K</kbd>
            Quick search & navigate
          </div>
        </div>
      </div>

      {/* Completion note dialog */}
      <Dialog open={!!noteDialogTask} onOpenChange={(o) => !o && setNoteDialogTask(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" /> Complete Task
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">Add a note about what you learned (optional):</p>
            <Input
              placeholder="e.g. Understood recursion well, need more practice on trees..."
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmComplete()}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setCompletionNote(""); confirmComplete(); }}>
                Skip Note
              </Button>
              <Button size="sm" onClick={confirmComplete} className="gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Complete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
