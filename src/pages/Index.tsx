import { useStudyStore } from "@/stores/useStudyStore";
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
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

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
  const { tasks, sessions } = useStudyStore();
  const { profile, signOut } = useAuth();

  const today = new Date().toISOString().split("T")[0];
  const todaysTasks = tasks.filter((t) => t.date === today);
  const completedToday = todaysTasks.filter((t) => t.status === "completed").length;
  const totalMinutesToday = sessions
    .filter((s) => s.date === today)
    .reduce((acc, s) => acc + s.duration, 0);
  const totalHoursWeek = (sessions.reduce((acc, s) => acc + s.duration, 0) / 60).toFixed(1);

  const displayName = profile?.display_name || profile?.username || "Scholar";

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">
            Good evening, <span className="text-gradient-primary">{displayName}</span>
          </h1>
          <p className="text-muted-foreground text-sm md:text-base mt-1">
            You have {todaysTasks.filter((t) => t.status === "pending").length} tasks remaining today.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} className="gap-2 text-muted-foreground self-start">
          <LogOut className="w-4 h-4" /> Sign out
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard icon={CalendarDays} label="Today's Tasks" value={`${completedToday}/${todaysTasks.length}`} sublabel="tasks completed" variant="primary" />
        <StatCard icon={Clock} label="Study Time" value={`${Math.round(totalMinutesToday / 60)}h ${totalMinutesToday % 60}m`} sublabel="today" variant="default" />
        <StatCard icon={TrendingUp} label="Weekly Hours" value={`${totalHoursWeek}h`} sublabel="this week" variant="accent" />
        <StatCard icon={CheckCircle2} label="Completion Rate" value={`${tasks.length > 0 ? Math.round((tasks.filter((t) => t.status === "completed").length / tasks.length) * 100) : 0}%`} sublabel="overall" variant="success" />
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
            {todaysTasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${
                  task.status === "completed"
                    ? "bg-success/5 border-success/20 opacity-70"
                    : "bg-card border-border hover:border-primary/30"
                }`}
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  task.priority === "high" ? "bg-destructive" : task.priority === "medium" ? "bg-accent" : "bg-muted-foreground"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                    {task.topic}
                  </p>
                  <p className="text-xs text-muted-foreground">{task.subject} · {task.timeSlot} · {task.duration}min</p>
                </div>
                {task.status === "completed" && (
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
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
            <QuickActionCard icon={BookOpen} title="Start Focus Session" description="25 min Pomodoro timer" to="/timer" variant="primary" />
            <QuickActionCard icon={Sparkles} title="Ask AI Tutor" description="Get help with any topic" to="/tutor" variant="accent" />
            <QuickActionCard icon={CheckCircle2} title="Review Flashcards" description={`${useStudyStore.getState().flashcards.filter((f) => !f.mastered).length} cards to review`} to="/flashcards" />
            <QuickActionCard icon={TrendingUp} title="View Analytics" description="Track your progress" to="/analytics" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
