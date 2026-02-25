import { useState } from "react";
import { useStudyStore, StudyTask } from "@/stores/useStudyStore";
import { Check, X, Plus, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dates = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(2026, 1, 23 + i);
  return { day: daysOfWeek[i], date: d.getDate(), full: d.toISOString().split("T")[0] };
});

export default function Planner() {
  const { tasks, updateTaskStatus, addTask, subjects } = useStudyStore();
  const [selectedDate, setSelectedDate] = useState("2026-02-25");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [newSubject, setNewSubject] = useState(subjects[0]);
  const [newTime, setNewTime] = useState("18:00");
  const [newDuration, setNewDuration] = useState("45");

  const dayTasks = tasks.filter((t) => t.date === selectedDate);

  const handleAdd = () => {
    if (!newTopic) return;
    addTask({
      id: `t-${Date.now()}`,
      subject: newSubject,
      topic: newTopic,
      date: selectedDate,
      timeSlot: newTime,
      duration: parseInt(newDuration),
      status: "pending",
      priority: "medium",
    });
    setNewTopic("");
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" /> Study Planner
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your study sessions and track progress</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Add Task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Study Task</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <Select value={newSubject} onValueChange={setNewSubject}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Topic name..." value={newTopic} onChange={(e) => setNewTopic(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
                <Input type="number" placeholder="Duration (min)" value={newDuration} onChange={(e) => setNewDuration(e.target.value)} />
              </div>
              <Button onClick={handleAdd} className="w-full">Add to Schedule</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Week selector */}
      <div className="flex gap-2">
        {dates.map((d) => (
          <button
            key={d.full}
            onClick={() => setSelectedDate(d.full)}
            className={`flex-1 flex flex-col items-center py-3 rounded-xl border transition-all duration-200 ${
              selectedDate === d.full
                ? "bg-primary/10 border-primary/30 glow-primary"
                : "bg-card border-border hover:border-primary/20"
            }`}
          >
            <span className="text-xs text-muted-foreground">{d.day}</span>
            <span className={`text-lg font-display font-bold mt-1 ${selectedDate === d.full ? "text-primary" : ""}`}>{d.date}</span>
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {dayTasks.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No tasks for this day</p>
            <p className="text-sm">Add a study session to get started</p>
          </div>
        )}
        {dayTasks.map((task) => (
          <div
            key={task.id}
            className={`flex items-center gap-4 p-5 rounded-xl border transition-all duration-200 ${
              task.status === "completed" ? "bg-success/5 border-success/20" :
              task.status === "skipped" ? "bg-destructive/5 border-destructive/20 opacity-60" :
              "bg-card border-border"
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  task.priority === "high" ? "bg-destructive/10 text-destructive" :
                  task.priority === "medium" ? "bg-accent/10 text-accent" :
                  "bg-muted text-muted-foreground"
                }`}>{task.priority}</span>
                <span className="text-xs text-muted-foreground">{task.subject}</span>
              </div>
              <p className={`font-medium ${task.status !== "pending" ? "line-through text-muted-foreground" : ""}`}>{task.topic}</p>
              <p className="text-sm text-muted-foreground mt-1">{task.timeSlot} · {task.duration} min</p>
            </div>
            {task.status === "pending" && (
              <div className="flex gap-2">
                <button
                  onClick={() => updateTaskStatus(task.id, "completed")}
                  className="w-9 h-9 rounded-lg bg-success/10 text-success hover:bg-success/20 flex items-center justify-center transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updateTaskStatus(task.id, "skipped")}
                  className="w-9 h-9 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
