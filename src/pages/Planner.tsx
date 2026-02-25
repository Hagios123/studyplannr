import { useState } from "react";
import { useStudyStore, StudyTask, Difficulty } from "@/stores/useStudyStore";
import { Check, X, Plus, CalendarDays, Sparkles, Settings2, Pencil, Trash2, Clock, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekDates(referenceDate: Date) {
  const day = referenceDate.getDay();
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { day: daysOfWeek[i], date: d.getDate(), full: d.toISOString().split("T")[0] };
  });
}

const DIFFICULTY_LABELS: Record<Difficulty, { label: string; color: string; duration: string }> = {
  easy: { label: "Easy", color: "bg-success/10 text-success", duration: "~20 min" },
  moderate: { label: "Moderate", color: "bg-accent/10 text-accent", duration: "~40 min" },
  hard: { label: "Hard", color: "bg-destructive/10 text-destructive", duration: "~60 min" },
};

export default function Planner() {
  const {
    tasks, updateTaskStatus, addTask, deleteTask, updateTask,
    subjects, subjectConfigs, updateSubjectConfig,
    freeTimeSlots, addFreeTimeSlot, removeFreeTimeSlot,
    autoGenerateTasks,
  } = useStudyStore();

  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);

  // Add task form
  const [newTopic, setNewTopic] = useState("");
  const [newSubject, setNewSubject] = useState(subjects[0]);
  const [newTime, setNewTime] = useState("18:00");
  const [newDuration, setNewDuration] = useState("45");
  const [newPriority, setNewPriority] = useState<StudyTask["priority"]>("medium");

  // Generate form
  const [genStartDate, setGenStartDate] = useState<Date>(new Date());
  const [genDays, setGenDays] = useState("7");

  const dates = getWeekDates(new Date(selectedDate + "T12:00:00"));
  const dayTasks = tasks.filter((t) => t.date === selectedDate).sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));

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
      priority: newPriority,
    });
    setNewTopic("");
    setDialogOpen(false);
    toast({ title: "Task added", description: `"${newTopic}" scheduled for ${selectedDate}` });
  };

  const handleEdit = () => {
    if (!editingTask) return;
    updateTask(editingTask.id, {
      subject: editingTask.subject,
      topic: editingTask.topic,
      timeSlot: editingTask.timeSlot,
      duration: editingTask.duration,
      priority: editingTask.priority,
    });
    setEditingTask(null);
    toast({ title: "Task updated" });
  };

  const handleGenerate = () => {
    const dateStr = genStartDate.toISOString().split("T")[0];
    autoGenerateTasks(dateStr, parseInt(genDays));
    setGenerateOpen(false);
    toast({
      title: "Schedule generated!",
      description: `Tasks auto-created for ${genDays} days starting ${format(genStartDate, "MMM d")}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" /> Study Planner
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your study sessions and track progress</p>
        </div>
        <div className="flex gap-2">
          {/* Settings */}
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon"><Settings2 className="w-4 h-4" /></Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Schedule Settings</DialogTitle></DialogHeader>
              <Tabs defaultValue="subjects" className="mt-2">
                <TabsList className="w-full">
                  <TabsTrigger value="subjects" className="flex-1">Subject Difficulty</TabsTrigger>
                  <TabsTrigger value="time" className="flex-1">Free Time</TabsTrigger>
                </TabsList>

                <TabsContent value="subjects" className="space-y-3 mt-4">
                  <p className="text-xs text-muted-foreground">Set difficulty per subject. This controls auto-generated task durations: Easy (~20 min), Moderate (~40 min), Hard (~60 min).</p>
                  {subjectConfigs.map((sc) => (
                    <div key={sc.name} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                      <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 font-medium text-sm">{sc.name}</span>
                      <Select
                        value={sc.difficulty}
                        onValueChange={(val) => updateSubjectConfig(sc.name, { difficulty: val as Difficulty })}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(["easy", "moderate", "hard"] as Difficulty[]).map((d) => (
                            <SelectItem key={d} value={d}>
                              <span className="flex items-center gap-2">
                                {DIFFICULTY_LABELS[d].label}
                                <span className="text-xs text-muted-foreground">{DIFFICULTY_LABELS[d].duration}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="time" className="space-y-3 mt-4">
                  <p className="text-xs text-muted-foreground">Define when you're free to study each day. The AI scheduler will fit tasks into these windows.</p>
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => {
                    const slot = freeTimeSlots.find((s) => s.day === day);
                    return (
                      <div key={day} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                        <span className="w-24 text-sm font-medium">{day.slice(0, 3)}</span>
                        {slot ? (
                          <>
                            <Input
                              type="time"
                              value={slot.startTime}
                              onChange={(e) => addFreeTimeSlot({ ...slot, startTime: e.target.value })}
                              className="w-28"
                            />
                            <span className="text-muted-foreground text-xs">to</span>
                            <Input
                              type="time"
                              value={slot.endTime}
                              onChange={(e) => addFreeTimeSlot({ ...slot, endTime: e.target.value })}
                              className="w-28"
                            />
                            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removeFreeTimeSlot(day)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => addFreeTimeSlot({ day, startTime: "18:00", endTime: "21:00" })}>
                            <Plus className="w-3 h-3 mr-1" /> Add slot
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>

          {/* Auto Generate */}
          <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Sparkles className="w-4 h-4" /> Auto Generate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-accent" /> Smart Schedule Generator</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground">
                  Automatically creates study tasks based on your subjects, their difficulty levels, and your available free time.
                  Complex subjects get longer sessions, easy ones are shorter.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {subjectConfigs.map((sc) => (
                    <div key={sc.name} className={`text-center p-2 rounded-lg border border-border ${DIFFICULTY_LABELS[sc.difficulty].color}`}>
                      <p className="text-xs font-medium">{sc.name}</p>
                      <p className="text-[10px] opacity-70">{DIFFICULTY_LABELS[sc.difficulty].duration}/session</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Start date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(genStartDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={genStartDate}
                        onSelect={(d) => d && setGenStartDate(d)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Number of days</label>
                  <Select value={genDays} onValueChange={setGenDays}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["3", "5", "7", "14", "21", "30"].map((n) => (
                        <SelectItem key={n} value={n}>{n} days</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleGenerate} className="w-full gap-2">
                  <Sparkles className="w-4 h-4" /> Generate Schedule
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Task */}
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
                <Select value={newPriority} onValueChange={(v) => setNewPriority(v as StudyTask["priority"])}>
                  <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleAdd} className="w-full">Add to Schedule</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
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
            <p className="text-sm">Add a study session or use Auto Generate</p>
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
            {/* Time indicator */}
            <div className="flex flex-col items-center shrink-0 w-14">
              <Clock className="w-3.5 h-3.5 text-muted-foreground mb-1" />
              <span className="text-sm font-medium tabular-nums">{task.timeSlot}</span>
              <span className="text-[10px] text-muted-foreground">{task.duration}m</span>
            </div>

            <div className="w-px h-10 bg-border shrink-0" />

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
            </div>

            <div className="flex gap-1.5">
              {task.status === "pending" && (
                <>
                  <button
                    onClick={() => setEditingTask({ ...task })}
                    className="w-8 h-8 rounded-lg bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      deleteTask(task.id);
                      toast({ title: "Task deleted" });
                    }}
                    className="w-8 h-8 rounded-lg bg-secondary text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => updateTaskStatus(task.id, "completed")}
                    className="w-8 h-8 rounded-lg bg-success/10 text-success hover:bg-success/20 flex items-center justify-center transition-colors"
                    title="Complete"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => updateTaskStatus(task.id, "skipped")}
                    className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center transition-colors"
                    title="Skip"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
          {editingTask && (
            <div className="space-y-4 pt-2">
              <Select value={editingTask.subject} onValueChange={(v) => setEditingTask({ ...editingTask, subject: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                placeholder="Topic name..."
                value={editingTask.topic}
                onChange={(e) => setEditingTask({ ...editingTask, topic: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="time"
                  value={editingTask.timeSlot}
                  onChange={(e) => setEditingTask({ ...editingTask, timeSlot: e.target.value })}
                />
                <Input
                  type="number"
                  value={editingTask.duration}
                  onChange={(e) => setEditingTask({ ...editingTask, duration: parseInt(e.target.value) || 0 })}
                />
              </div>
              <Select
                value={editingTask.priority}
                onValueChange={(v) => setEditingTask({ ...editingTask, priority: v as StudyTask["priority"] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleEdit} className="w-full">Save Changes</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
