import { useState } from "react";
import { useStudyStore } from "@/stores/useStudyStore";
import { HelpCircle, Check, X, RotateCcw, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AIQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export default function Quiz() {
  const { quizQuestions, subjectConfigs, tasks } = useStudyStore();
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

  // Get today's scheduled subjects for suggestions
  const today = new Date().toISOString().split("T")[0];
  const todayTasks = tasks.filter((t) => t.date === today && t.status === "pending");

  const generateQuiz = async (subject: string, topic: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: { subject, topic, count: 5 },
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
      } else {
        toast({ title: "No questions generated", description: "Try a different topic", variant: "destructive" });
      }
    } catch (e: any) {
      console.error("Quiz gen error:", e);
      toast({ title: "Error", description: e.message || "Failed to generate quiz", variant: "destructive" });
    }
    setLoading(false);
  };

  const useMockQuiz = () => {
    setAiQuestions(
      quizQuestions.map((q) => ({
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: "",
      }))
    );
    setCurrentIndex(0);
    setSelected(null);
    setShowResult(false);
    setScore(0);
    setMode("playing");
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
    } else {
      setCurrentIndex((i) => i + 1);
      setSelected(null);
      setShowResult(false);
    }
  };

  if (mode === "select") {
    const sc = subjectConfigs.find((s) => s.name === selectedSubject);
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-primary" /> Quiz
          </h1>
          <p className="text-muted-foreground text-sm mt-1">AI-generated quizzes based on your subjects</p>
        </div>

        {/* Today's study suggestions */}
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

        {/* Manual select */}
        <div className="max-w-md space-y-4 p-6 rounded-xl border border-border bg-card">
          <h3 className="font-display font-semibold">Generate AI Quiz</h3>

          <Select value={selectedSubject} onValueChange={(v) => { setSelectedSubject(v); setSelectedTopic(""); }}>
            <SelectTrigger><SelectValue placeholder="Choose subject" /></SelectTrigger>
            <SelectContent>
              {subjectConfigs.map((s) => (
                <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {sc && sc.topics.length > 0 && (
            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
              <SelectTrigger><SelectValue placeholder="Choose topic" /></SelectTrigger>
              <SelectContent>
                {sc.topics.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            onClick={() => generateQuiz(selectedSubject, selectedTopic || selectedSubject)}
            disabled={!selectedSubject || loading}
            className="w-full gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate Quiz
          </Button>

          <div className="text-center">
            <button onClick={useMockQuiz} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              or use practice questions
            </button>
          </div>
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
          <div className={`text-7xl font-display font-bold ${pct >= 70 ? "text-gradient-primary" : "text-accent"}`}>
            {pct}%
          </div>
          <p className="text-lg text-muted-foreground">
            You answered {score} out of {aiQuestions.length} questions correctly.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => setMode("select")} variant="outline" className="gap-2">
              <RotateCcw className="w-4 h-4" /> New Quiz
            </Button>
            <Button onClick={() => { setCurrentIndex(0); setSelected(null); setShowResult(false); setScore(0); setMode("playing"); }} className="gap-2">
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
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-primary" /> Quiz
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Question {currentIndex + 1} of {aiQuestions.length} · Score: {score}
        </p>
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
            <Button variant="outline" onClick={() => setMode("select")}>Exit</Button>
            <Button onClick={next}>
              {currentIndex + 1 >= aiQuestions.length ? "See Results" : "Next Question"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
