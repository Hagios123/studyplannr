import { useState, useMemo } from "react";
import { useExtrasStore, Habit } from "@/stores/useExtrasStore";
import {
  Heart, Plus, Trash2, Check, Flame, TrendingUp,
  Droplets, BookOpen, Dumbbell, Moon, Coffee, Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const HABIT_ICONS: Record<string, any> = {
  "📚": BookOpen,
  "💧": Droplets,
  "🏋️": Dumbbell,
  "😴": Moon,
  "☕": Coffee,
  "🧠": Brain,
  "❤️": Heart,
};

const ICON_OPTIONS = [
  { emoji: "📚", label: "Study" },
  { emoji: "💧", label: "Water" },
  { emoji: "🏋️", label: "Exercise" },
  { emoji: "😴", label: "Sleep" },
  { emoji: "☕", label: "Breaks" },
  { emoji: "🧠", label: "Mindfulness" },
  { emoji: "❤️", label: "Health" },
];

const COLOR_OPTIONS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--success))",
  "hsl(var(--destructive))",
  "hsl(270, 60%, 60%)",
  "hsl(340, 65%, 55%)",
];

function getStreak(habit: Habit): number {
  let count = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const done = (habit.completions[dateStr] || 0) >= habit.targetPerDay;
    if (i === 0 && !habit.completions[dateStr]) continue;
    if (done) count++;
    else if (i > 0) break;
  }
  return count;
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

export default function Habits() {
  const { habits, addHabit, deleteHabit, logHabit } = useExtrasStore();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📚");
  const [target, setTarget] = useState(1);
  const [unit, setUnit] = useState("times");
  const [color, setColor] = useState(COLOR_OPTIONS[0]);

  const today = new Date().toISOString().split("T")[0];
  const last7 = useMemo(() => getLast7Days(), []);

  const handleCreate = () => {
    if (!name.trim()) return;
    addHabit({
      id: `habit-${Date.now()}`,
      name: name.trim(),
      icon,
      color,
      targetPerDay: target,
      unit,
      completions: {},
    });
    setName("");
    setCreateOpen(false);
    toast({ title: "Habit created!" });
  };

  const todayCompleted = habits.filter((h) => (h.completions[today] || 0) >= h.targetPerDay).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
            <Heart className="w-5 h-5 md:w-6 md:h-6 text-primary" /> Habits
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            {todayCompleted}/{habits.length} completed today
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" /> New Habit</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Create Habit</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <Input placeholder="Habit name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              <div className="space-y-2">
                <label className="text-sm font-medium">Icon</label>
                <div className="flex gap-2 flex-wrap">
                  {ICON_OPTIONS.map((opt) => (
                    <button
                      key={opt.emoji}
                      onClick={() => setIcon(opt.emoji)}
                      className={`w-10 h-10 rounded-xl border text-lg flex items-center justify-center transition-all ${
                        icon === opt.emoji ? "border-primary bg-primary/10" : "border-border bg-secondary/50"
                      }`}
                    >
                      {opt.emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <label className="text-sm font-medium">Target</label>
                  <Input type="number" min={1} value={target} onChange={(e) => setTarget(Number(e.target.value))} />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-sm font-medium">Unit</label>
                  <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="times, glasses, mins..." />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Color</label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-offset-background ring-primary" : ""}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <Button onClick={handleCreate} disabled={!name.trim()} className="w-full">Create Habit</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {habits.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Heart className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-display font-semibold text-lg">No habits yet</p>
          <p className="text-sm mt-1">Create habits to build healthy study routines.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {habits.map((habit) => {
            const todayCount = habit.completions[today] || 0;
            const isComplete = todayCount >= habit.targetPerDay;
            const streak = getStreak(habit);

            return (
              <div key={habit.id} className="p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ backgroundColor: `${habit.color}20` }}
                  >
                    {habit.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-semibold">{habit.name}</h3>
                      {isComplete && <Check className="w-4 h-4 text-success" />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {todayCount}/{habit.targetPerDay} {habit.unit} today
                      {streak > 0 && (
                        <span className="ml-2 text-accent">
                          <Flame className="w-3 h-3 inline" /> {streak} day streak
                        </span>
                      )}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={isComplete ? "outline" : "default"}
                    onClick={() => logHabit(habit.id, today)}
                    className="gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Log
                  </Button>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => deleteHabit(habit.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-border rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (todayCount / habit.targetPerDay) * 100)}%`,
                      backgroundColor: habit.color,
                    }}
                  />
                </div>

                {/* Last 7 days */}
                <div className="flex gap-1.5 items-end">
                  {last7.map((date) => {
                    const count = habit.completions[date] || 0;
                    const done = count >= habit.targetPerDay;
                    const d = new Date(date + "T12:00:00");
                    return (
                      <div key={date} className="flex-1 text-center">
                        <div
                          className={`h-6 rounded transition-all ${done ? "" : "bg-border/50"}`}
                          style={done ? { backgroundColor: habit.color } : {}}
                          title={`${d.toLocaleDateString("en-US", { weekday: "short" })}: ${count}/${habit.targetPerDay}`}
                        />
                        <span className="text-[9px] text-muted-foreground mt-1 block">
                          {d.toLocaleDateString("en-US", { weekday: "narrow" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
