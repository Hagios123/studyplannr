import { useState, useMemo } from "react";
import { useStudyStore } from "@/stores/useStudyStore";
import { Layers, RotateCw, Check, ChevronLeft, ChevronRight, Clock, Sparkles, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Flashcards() {
  const { flashcards, toggleFlashcardMastered, addFlashcard, tasks, subjects, subjectConfigs } = useStudyStore();
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [filter, setFilter] = useState<"scheduled" | "all" | "unmastered">("scheduled");

  // AI generation state
  const [genOpen, setGenOpen] = useState(false);
  const [genSubject, setGenSubject] = useState("");
  const [genTopic, setGenTopic] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [genCount, setGenCount] = useState(5);
  const [generating, setGenerating] = useState(false);

  const allSubjects = [...new Set([...subjects, ...subjectConfigs.map(s => s.name)])];
  const selectedConfig = subjectConfigs.find(s => s.name === genSubject);

  // Find the currently active study task based on current time
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const todayTasks = tasks
    .filter((t) => t.date === today && t.status === "pending")
    .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));

  const activeTask = useMemo(() => {
    for (const task of todayTasks) {
      const [h, m] = task.timeSlot.split(":").map(Number);
      const endMinutes = h * 60 + m + task.duration;
      const endTime = `${String(Math.floor(endMinutes / 60) % 24).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
      if (currentTime >= task.timeSlot && currentTime <= endTime) return task;
    }
    return todayTasks.find((t) => t.timeSlot > currentTime) || todayTasks[0] || null;
  }, [todayTasks, currentTime]);

  const filtered = useMemo(() => {
    if (filter === "scheduled" && activeTask) {
      const matching = flashcards.filter(
        (f) => f.subject === activeTask.subject ||
               f.topic?.toLowerCase().includes(activeTask.topic.toLowerCase().split(" ")[0])
      );
      return matching.length > 0 ? matching : flashcards.filter((f) => !f.mastered);
    }
    if (filter === "unmastered") return flashcards.filter((f) => !f.mastered);
    return flashcards;
  }, [filter, activeTask, flashcards]);

  const card = filtered[currentIndex];

  const next = () => { setFlipped(false); setCurrentIndex((prev) => (prev + 1) % filtered.length); };
  const prev = () => { setFlipped(false); setCurrentIndex((prev) => (prev - 1 + filtered.length) % filtered.length); };

  const effectiveSubject = genSubject === "__custom__" ? customSubject : genSubject;
  const effectiveTopic = genTopic === "__custom_topic__" ? customTopic : (genTopic || customTopic || effectiveSubject);

  const generateFlashcards = async () => {
    if (!effectiveSubject) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: {
          subject: effectiveSubject,
          topic: effectiveTopic,
          count: genCount,
          type: "flashcards",
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: "AI Error", description: data.error, variant: "destructive" });
        setGenerating(false);
        return;
      }

      const cards = data?.flashcards || data?.questions || [];
      if (cards.length === 0) {
        toast({ title: "No cards generated", description: "Try a different topic", variant: "destructive" });
        setGenerating(false);
        return;
      }

      cards.forEach((c: any) => {
        addFlashcard({
          id: `ai-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          subject: effectiveSubject,
          topic: effectiveTopic,
          front: c.front || c.question,
          back: c.back || c.explanation || c.options?.[c.correctIndex] || "",
          mastered: false,
        });
      });

      toast({ title: "Flashcards generated!", description: `${cards.length} new cards added` });
      setGenOpen(false);
      setFilter("all");
      setCurrentIndex(0);
      setFlipped(false);
    } catch (e: any) {
      console.error("Flashcard gen error:", e);
      toast({ title: "Error", description: e.message || "Failed to generate flashcards", variant: "destructive" });
    }
    setGenerating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
            <Layers className="w-5 h-5 md:w-6 md:h-6 text-primary" /> Flashcards
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            {filtered.length} cards · {flashcards.filter((f) => f.mastered).length} mastered
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={genOpen} onOpenChange={setGenOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> AI Generate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Generate AI Flashcards</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <Select value={genSubject} onValueChange={(v) => { setGenSubject(v); setGenTopic(""); }}>
                  <SelectTrigger><SelectValue placeholder="Choose subject" /></SelectTrigger>
                  <SelectContent>
                    {allSubjects.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                    <SelectItem value="__custom__">+ Custom subject...</SelectItem>
                  </SelectContent>
                </Select>

                {genSubject === "__custom__" && (
                  <Input placeholder="Enter any subject..." value={customSubject} onChange={(e) => setCustomSubject(e.target.value)} />
                )}

                {selectedConfig && selectedConfig.topics.length > 0 && (
                  <Select value={genTopic} onValueChange={setGenTopic}>
                    <SelectTrigger><SelectValue placeholder="Choose topic" /></SelectTrigger>
                    <SelectContent>
                      {selectedConfig.topics.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                      <SelectItem value="__custom_topic__">+ Custom topic...</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {(genSubject === "__custom__" || genTopic === "__custom_topic__" || (!selectedConfig && genSubject)) && (
                  <Input placeholder="Enter topic (optional)..." value={customTopic} onChange={(e) => setCustomTopic(e.target.value)} />
                )}

                <div className="flex items-center gap-3">
                  <label className="text-sm text-muted-foreground">Number of cards:</label>
                  <Input type="number" min={1} max={20} value={genCount} onChange={(e) => setGenCount(Number(e.target.value))} className="w-20" />
                </div>

                <Button onClick={generateFlashcards} disabled={!effectiveSubject || generating} className="w-full gap-2">
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generate Flashcards
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant={filter === "scheduled" ? "default" : "outline"}
            size="sm"
            onClick={() => { setFilter("scheduled"); setCurrentIndex(0); setFlipped(false); }}
            className="gap-1.5"
          >
            <Clock className="w-3 h-3" /> Scheduled
          </Button>
          <Button variant={filter === "unmastered" ? "default" : "outline"} size="sm" onClick={() => { setFilter("unmastered"); setCurrentIndex(0); setFlipped(false); }}>
            To Review
          </Button>
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => { setFilter("all"); setCurrentIndex(0); setFlipped(false); }}>
            All
          </Button>
        </div>
      </div>

      {activeTask && filter === "scheduled" && (
        <div className="p-3 rounded-lg bg-accent/5 border border-accent/20 flex items-center gap-2">
          <Clock className="w-4 h-4 text-accent shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="text-accent font-medium">Current study:</span>{" "}
            {activeTask.topic} ({activeTask.subject}) · {activeTask.timeSlot}
          </p>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Check className="w-12 h-12 mx-auto mb-3 text-success" />
          <p className="font-display font-semibold text-lg">
            {filter === "scheduled" ? "No flashcards for the current topic" : "All cards mastered!"}
          </p>
          <p className="text-sm mt-1">
            {filter === "scheduled" ? "Use 'AI Generate' to create cards for your subjects, or switch to 'All'." : "Great job! Switch to \"All\" to review again."}
          </p>
        </div>
      ) : (
        <>
          <div onClick={() => setFlipped(!flipped)} className="relative cursor-pointer mx-auto max-w-lg" style={{ perspective: "1000px" }}>
            <div className="relative w-full min-h-[280px] transition-transform duration-500" style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
              <div className="absolute inset-0 bg-card border border-border rounded-2xl p-8 flex flex-col items-center justify-center text-center" style={{ backfaceVisibility: "hidden" }}>
                <span className="text-xs text-primary font-medium uppercase tracking-wider mb-4">{card.subject}</span>
                <p className="text-xl font-display font-semibold leading-relaxed">{card.front}</p>
                <p className="text-xs text-muted-foreground mt-6 flex items-center gap-1">
                  <RotateCw className="w-3 h-3" /> Tap to reveal
                </p>
              </div>
              <div className="absolute inset-0 bg-primary/5 border border-primary/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                <span className="text-xs text-accent font-medium uppercase tracking-wider mb-4">Answer</span>
                <p className="text-lg leading-relaxed">{card.back}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" size="icon" onClick={prev}><ChevronLeft className="w-5 h-5" /></Button>
            <span className="text-sm text-muted-foreground tabular-nums">{currentIndex + 1} / {filtered.length}</span>
            <Button variant="outline" size="icon" onClick={next}><ChevronRight className="w-5 h-5" /></Button>
          </div>
          <div className="flex justify-center">
            <Button variant={card.mastered ? "outline" : "default"} onClick={() => toggleFlashcardMastered(card.id)} className="gap-2">
              <Check className="w-4 h-4" />
              {card.mastered ? "Unmark Mastered" : "Mark as Mastered"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
