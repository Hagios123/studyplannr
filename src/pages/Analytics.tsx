import { useMemo } from "react";
import { useStudyStore } from "@/stores/useStudyStore";
import { useGamificationStore, getLevel, getLevelProgress } from "@/stores/useGamificationStore";
import {
  BarChart3, TrendingUp, Clock, BookOpen, Flame, Trophy, Target, Brain,
  Zap, Star,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import { Progress } from "@/components/ui/progress";
import StudyHeatmap from "@/components/StudyHeatmap";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
};

const pieColors = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--chart-3, 152 60% 45%))",
  "hsl(var(--chart-4, 270 60% 60%))",
  "hsl(var(--chart-5, 340 65% 55%))",
  "hsl(var(--chart-1, 220 70% 55%))",
];

export default function Analytics() {
  const { sessions, tasks, flashcards, subjectConfigs } = useStudyStore();
  const { totalXP, tasksCompleted, quizzesCompleted, flashcardsMastered, sessionsCompleted, getStreak } = useGamificationStore();
  const level = getLevel(totalXP);
  const progress = getLevelProgress(totalXP);
  const streak = getStreak();

  const completedTasks = tasks.filter((t) => t.status === "completed");

  // Daily study hours (last 14 days)
  const dailyData = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days[d.toISOString().split("T")[0]] = 0;
    }
    completedTasks.forEach((t) => { if (days[t.date] !== undefined) days[t.date] += t.duration; });
    sessions.forEach((s) => { if (days[s.date] !== undefined) days[s.date] += s.duration; });
    return Object.entries(days).map(([date, mins]) => ({
      day: new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      hours: +(mins / 60).toFixed(1),
      minutes: mins,
    }));
  }, [completedTasks, sessions]);

  // Subject distribution
  const subjectData = useMemo(() => {
    const map: Record<string, number> = {};
    completedTasks.forEach((t) => { map[t.subject] = (map[t.subject] || 0) + t.duration; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [completedTasks]);

  // Weekly comparison
  const weeklyComparison = useMemo(() => {
    const now = new Date();
    const weeks: { label: string; minutes: number }[] = [];
    for (let w = 3; w >= 0; w--) {
      let total = 0;
      for (let d = 0; d < 7; d++) {
        const date = new Date(now);
        date.setDate(now.getDate() - (w * 7 + d));
        const key = date.toISOString().split("T")[0];
        completedTasks.filter((t) => t.date === key).forEach((t) => total += t.duration);
        sessions.filter((s) => s.date === key).forEach((s) => total += s.duration);
      }
      weeks.push({ label: w === 0 ? "This week" : w === 1 ? "Last week" : `${w}w ago`, minutes: total });
    }
    return weeks.map((w) => ({ ...w, hours: +(w.minutes / 60).toFixed(1) }));
  }, [completedTasks, sessions]);

  // Subject radar for difficulty
  const subjectRadar = useMemo(() => {
    return subjectConfigs.map((sc) => {
      const completed = completedTasks.filter((t) => t.subject === sc.name).length;
      const total = tasks.filter((t) => t.subject === sc.name).length;
      const mastery = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { subject: sc.name.slice(0, 12), mastery, tasks: total };
    }).slice(0, 6);
  }, [subjectConfigs, tasks, completedTasks]);

  const totalHours = (completedTasks.reduce((a, t) => a + t.duration, 0) / 60).toFixed(1);
  const avgDaily = dailyData.length > 0 ? (dailyData.reduce((a, d) => a + d.minutes, 0) / dailyData.length).toFixed(0) : "0";
  const bestDay = dailyData.reduce((best, d) => d.minutes > best.minutes ? d : best, { day: "-", minutes: 0 });

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" /> Study Analytics
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Deep insights into your learning patterns</p>
      </div>

      {/* Level + XP banner */}
      <div className="rounded-xl border border-accent/20 bg-accent/5 p-5">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <span className="text-xl font-display font-bold text-accent">{level}</span>
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Level {level}</p>
            <p className="text-2xl font-display font-bold">{totalXP.toLocaleString()} XP</p>
          </div>
          <div className="flex items-center gap-1 text-accent">
            <Flame className="w-5 h-5" />
            <span className="text-lg font-display font-bold">{streak}</span>
            <span className="text-xs text-muted-foreground ml-1">day streak</span>
          </div>
        </div>
        <Progress value={progress.percent} className="h-2" />
        <p className="text-[10px] text-muted-foreground text-center mt-1">{progress.current} / {progress.needed} XP to next level</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { icon: Clock, label: "Total Hours", value: `${totalHours}h`, color: "text-primary" },
          { icon: Target, label: "Tasks Done", value: String(tasksCompleted), color: "text-success" },
          { icon: Zap, label: "Quizzes", value: String(quizzesCompleted), color: "text-accent" },
          { icon: Star, label: "Cards Mastered", value: String(flashcardsMastered), color: "text-primary" },
          { icon: Brain, label: "Avg Daily", value: `${avgDaily}m`, color: "text-accent" },
          { icon: Trophy, label: "Best Day", value: bestDay.minutes > 0 ? `${Math.round(bestDay.minutes / 60)}h ${bestDay.minutes % 60}m` : "-", color: "text-primary" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <stat.icon className={`w-5 h-5 mx-auto mb-1.5 ${stat.color}`} />
            <p className="text-xl font-display font-bold">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <StudyHeatmap />

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Daily Study Hours (14 days)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="hours" stroke="hsl(var(--primary))" fill="url(#colorHours)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-accent" /> Subject Split
          </h3>
          {subjectData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Complete tasks to see stats</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={subjectData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value">
                    {subjectData.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => `${(value / 60).toFixed(1)}h`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {subjectData.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pieColors[i % pieColors.length] }} />
                    <span className="text-muted-foreground flex-1 truncate">{s.name}</span>
                    <span className="font-medium">{(s.value / 60).toFixed(1)}h</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Weekly Comparison
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {subjectRadar.length > 2 && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
              <Brain className="w-4 h-4 text-accent" /> Subject Mastery
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={subjectRadar}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                <Radar name="Mastery %" dataKey="mastery" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
