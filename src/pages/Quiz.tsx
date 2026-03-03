import { useState, useEffect, useCallback } from "react";
import { useStudyStore } from "@/stores/useStudyStore";
import { HelpCircle, Check, X, RotateCcw, Sparkles, Loader2, Timer, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AIQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

type QuizDifficulty = "very-easy" | "easy" | "medium" | "hard" | "expert";

const DIFFICULTY_LABELS: Record<QuizDifficulty, { label: string; color: string; description: string }> = {
  "very-easy": { label: "Very Easy", color: "bg-success/20 text-success", description: "Basic recall questions" },
  easy: { label: "Easy", color: "bg-success/10 text-success", description: "Simple understanding" },
  medium: { label: "Medium", color: "bg-accent/10 text-accent", description: "Application-level" },
  hard: { label: "Hard", color: "bg-destructive/10 text-destructive", description: "Analysis & synthesis" },
  expert: { label: "Expert", color: "bg-destructive/20 text-destructive", description: "Critical thinking" },
};

export default function Quiz() {
  const { subjectConfigs, tasks, subjects } = useStudyStore();
  const { toast } = useToast();

  const [mode, setMode] = useState<"select" | "playing" | "finished">("select");
  const [aiQuestions, setAiQuestions] = useState<AIQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [customSubject, setCustomSubject] = useState("");
  const [customTopic, setCustomTopic] = useState("");

  // New options
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("medium");
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const todayTasks = tasks.filter((t) => t.date === today && t.status === "pending");
  const allSubjects = [...new Set([...subjects, ...subjectConfigs.map(s => s.name)])];

  // Timer countdown
  useEffect(() => {
    if (!timerRunning || !timerEnabled || mode !== "playing") return;
    if (timerSeconds <= 0) {
      setMode("finished");
      setTimerRunning(false);
      return;
    }
    const interval = setInterval(() => {
      setTimerSeconds(s => {
        if (s <= 1) {
          setTimerRunning(false);
          setMode("finished");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timerEnabled, mode, timerSeconds]);

  const generateQuiz = async (subject: string, topic: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: { subject, topic, count: questionCount, difficulty },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: "AI Error", description: data.error, variant: "destructive" });
        setLoading(false);
        return;
      }

      if (data?.questions?.length > 0) {
        setAiQuestions(data.questions);
        setCurrentIndex(0);
        setSelected(null);
        setShowResult(false);
        setScore(0);
        setMode("playing");
        if (timerEnabled) {
          setTimerSeconds(timerMinutes * 60);
          setTimerRunning(true);
        }
      } else {
        toast({ title: "No questions generated", description: "Try a different topic", variant: "destructive" });
      }
    } catch (e: any) {
      console.error("Quiz gen error:", e);
      toast({ title: "Error", description: e.message || "Failed to generate quiz", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleSelect = (idx: number) => {
    if (showResult) return;
    setSelected(idx);
    setShowResult(true);
    if (idx === aiQuestions[currentIndex].correctIndex) setScore((s) => s + 1);
  };

  const next = () => {
    if (currentIndex + 1 >= aiQuestions.length) {
      setMode("finished");
      setTimerRunning(false);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelected(null);
      setShowResult(false);
    }
  };

  const effectiveSubject = selectedSubject === "__custom__" ? customSubject : selectedSubject;
  const sc = subjectConfigs.find((s) => s.name === selectedSubject);

  const formatTime = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  if (mode === "select") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-primary" /> Quiz
          </h1>
          <p className="text-muted-foreground text-sm mt-1">AI-generated quizzes on any subject</p>
        </div>

        {todayTasks.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-accent flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Suggested from today's schedule
            </p>
            <div className="flex flex-wrap gap-2">
              {todayTasks.map((task) => (
                <Button
                  key={task.id}
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => generateQuiz(task.subject, task.topic)}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {task.topic}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="max-w-md space-y-4 p-6 rounded-xl border border-border bg-card">
          <h3 className="font-display font-semibold">Generate AI Quiz</h3>

          <Select value={selectedSubject} onValueChange={(v) => { setSelectedSubject(v); setSelectedTopic(""); }}>
            <SelectTrigger><SelectValue placeholder="Choose subject" /></SelectTrigger>
            <SelectContent>
              {allSubjects.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
              <SelectItem value="__custom__">+ Custom subject...</SelectItem>
            </SelectContent>
          </Select>

          {selectedSubject === "__custom__" && (
            <Input placeholder="Enter any subject..." value={customSubject} onChange={(e) => setCustomSubject(e.target.value)} />
          )}

          {sc && sc.topics.length > 0 && (
            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
              <SelectTrigger><SelectValue placeholder="Choose topic" /></SelectTrigger>
              <SelectContent>
                {sc.topics.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
                <SelectItem value="__custom_topic__">+ Custom topic...</SelectItem>
              </SelectContent>
            </Select>
          )}

          {(selectedSubject === "__custom__" || selectedTopic === "__custom_topic__" || (!sc && selectedSubject)) && (
            <Input placeholder="Enter topic (optional)..." value={customTopic} onChange={(e) => setCustomTopic(e.target.value)} />
          )}

          {/* Question count */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Questions: {questionCount}</label>
            </div>
            <Slider value={[questionCount]} onValueChange={([v]) => setQuestionCount(v)} min={3} max={20} step={1} />
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Difficulty</label>
            <div className="grid grid-cols-5 gap-1.5">
              {(Object.keys(DIFFICULTY_LABELS) as QuizDifficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`text-[10px] font-medium px-1.5 py-2 rounded-lg border transition-all ${
                    difficulty === d
                      ? `${DIFFICULTY_LABELS[d].color} border-current`
                      : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {DIFFICULTY_LABELS[d].label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">{DIFFICULTY_LABELS[difficulty].description}</p>
          </div>

          {/* Timer */}
          <div className="space-y-3 p-3 rounded-lg bg-secondary/50 border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Quiz Timer</span>
              </div>
              <Switch checked={timerEnabled} onCheckedChange={setTimerEnabled} />
            </div>
            {timerEnabled && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={timerMinutes}
                  onChange={(e) => setTimerMinutes(Math.max(1, Math.min(120, parseInt(e.target.value) || 1)))}
                  className="w-20"
                  min={1}
                  max={120}
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
            )}
          </div>

          <Button
            onClick={() => {
              const topic = selectedTopic === "__custom_topic__" ? customTopic : (selectedTopic || customTopic || effectiveSubject);
              generateQuiz(effectiveSubject, topic);
            }}
            disabled={!effectiveSubject || loading}
            className="w-full gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate Quiz
          </Button>
        </div>
      </div>
    );
  }

  if (mode === "finished") {
    const pct = Math.round((score / aiQuestions.length) * 100);
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-primary" /> Quiz Complete
        </h1>
        <div className="max-w-md mx-auto text-center py-12 space-y-6">
          {timerEnabled && timerSeconds <= 0 && (
            <div className="flex items-center justify-center gap-2 text-accent text-sm mb-2">
              <AlertTriangle className="w-4 h-4" /> Time's up!
            </div>
          )}
          <div className={`text-7xl font-display font-bold ${pct >= 70 ? "text-gradient-primary" : "text-accent"}`}>
            {pct}%
          </div>
          <p className="text-lg text-muted-foreground">
            You answered {score} out of {aiQuestions.length} questions correctly.
          </p>
          <p className="text-sm text-muted-foreground">
            Difficulty: <span className={`px-2 py-0.5 rounded-full text-xs ${DIFFICULTY_LABELS[difficulty].color}`}>{DIFFICULTY_LABELS[difficulty].label}</span>
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => setMode("select")} variant="outline" className="gap-2">
              <RotateCcw className="w-4 h-4" /> New Quiz
            </Button>
            <Button onClick={() => {
              setCurrentIndex(0); setSelected(null); setShowResult(false); setScore(0); setMode("playing");
              if (timerEnabled) { setTimerSeconds(timerMinutes * 60); setTimerRunning(true); }
            }} className="gap-2">
              <RotateCcw className="w-4 h-4" /> Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const q = aiQuestions[currentIndex];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-primary" /> Quiz
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Question {currentIndex + 1} of {aiQuestions.length} · Score: {score}
          </p>
        </div>
        {timerEnabled && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-display font-bold tabular-nums text-lg ${
            timerSeconds < 30 ? "border-destructive/30 bg-destructive/10 text-destructive animate-pulse" : "border-border bg-card text-foreground"
          }`}>
            <Timer className="w-4 h-4" />
            {formatTime(timerSeconds)}
          </div>
        )}
      </div>

      <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${((currentIndex + 1) / aiQuestions.length) * 100}%` }}
        />
      </div>

      <div className="max-w-2xl mx-auto space-y-6 py-4">
        <h2 className="text-xl font-display font-semibold">{q.question}</h2>

        <div className="space-y-3">
          {q.options.map((opt, idx) => {
            let style = "bg-card border-border hover:border-primary/30";
            if (showResult) {
              if (idx === q.correctIndex) style = "bg-success/10 border-success/30";
              else if (idx === selected) style = "bg-destructive/10 border-destructive/30";
              else style = "bg-card border-border opacity-50";
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 ${style}`}
                disabled={showResult}
              >
                <span className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-sm font-display font-bold shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="flex-1 font-medium text-sm">{opt}</span>
                {showResult && idx === q.correctIndex && <Check className="w-5 h-5 text-success" />}
                {showResult && idx === selected && idx !== q.correctIndex && <X className="w-5 h-5 text-destructive" />}
              </button>
            );
          })}
        </div>

        {showResult && q.explanation && (
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-sm">
            <p className="font-medium text-primary mb-1">Explanation</p>
            <p className="text-muted-foreground">{q.explanation}</p>
          </div>
        )}

        {showResult && (
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => { setMode("select"); setTimerRunning(false); }}>Exit</Button>
            <Button onClick={next}>
              {currentIndex + 1 >= aiQuestions.length ? "See Results" : "Next Question"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
