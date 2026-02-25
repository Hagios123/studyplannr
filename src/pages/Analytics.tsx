import { useStudyStore } from "@/stores/useStudyStore";
import { BarChart3, TrendingUp, Clock, BookOpen } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

export default function Analytics() {
  const { sessions, tasks } = useStudyStore();

  // Daily study hours (last 7 days)
  const dailyData = (() => {
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(2026, 1, 25 - i);
      const key = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { weekday: "short" });
      days[key] = 0;
    }
    sessions.forEach((s) => {
      if (days[s.date] !== undefined) days[s.date] += s.duration;
    });
    return Object.entries(days).map(([date, mins]) => ({
      day: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
      hours: +(mins / 60).toFixed(1),
    }));
  })();

  // Subject distribution
  const subjectData = (() => {
    const map: Record<string, number> = {};
    sessions.forEach((s) => {
      map[s.subject] = (map[s.subject] || 0) + s.duration;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  })();

  const pieColors = [
    "hsl(187, 80%, 52%)",
    "hsl(38, 92%, 55%)",
    "hsl(152, 60%, 45%)",
    "hsl(270, 60%, 60%)",
  ];

  // Completion stats
  const completed = tasks.filter((t) => t.status === "completed").length;
  const skipped = tasks.filter((t) => t.status === "skipped").length;
  const pending = tasks.filter((t) => t.status === "pending").length;
  const totalHours = (sessions.reduce((a, s) => a + s.duration, 0) / 60).toFixed(1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" /> Analytics
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Track your study patterns and progress</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Clock, label: "Total Hours", value: `${totalHours}h`, color: "text-primary" },
          { icon: TrendingUp, label: "Completed", value: String(completed), color: "text-success" },
          { icon: BookOpen, label: "Pending", value: String(pending), color: "text-accent" },
          { icon: BarChart3, label: "Skipped", value: String(skipped), color: "text-destructive" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-5">
            <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
            <p className="text-2xl font-display font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Study hours bar chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
          <h3 className="font-display font-semibold mb-4">Daily Study Hours</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(187, 80%, 52%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(187, 80%, 52%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 25%, 16%)" />
              <XAxis dataKey="day" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }} axisLine={false} />
              <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(222, 41%, 9%)",
                  border: "1px solid hsl(222, 25%, 16%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Area type="monotone" dataKey="hours" stroke="hsl(187, 80%, 52%)" fill="url(#colorHours)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Subject pie chart */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-display font-semibold mb-4">By Subject</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={subjectData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {subjectData.map((_, i) => (
                  <Cell key={i} fill={pieColors[i % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(222, 41%, 9%)",
                  border: "1px solid hsl(222, 25%, 16%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number) => `${(value / 60).toFixed(1)}h`}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {subjectData.map((s, i) => (
              <div key={s.name} className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pieColors[i % pieColors.length] }} />
                <span className="text-muted-foreground flex-1">{s.name}</span>
                <span className="font-medium">{(s.value / 60).toFixed(1)}h</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
