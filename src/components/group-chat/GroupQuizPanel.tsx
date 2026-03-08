import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Brain, Loader2, Trophy, CheckCircle2, XCircle, ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface AIQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface Quiz {
  id: string;
  group_id: string;
  title: string;
  subject: string;
  topic: string;
  difficulty: string;
  questions: AIQuestion[];
  created_by: string;
  created_at: string;
  status: string;
}

interface QuizResponse {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number;
  total: number;
  completed_at: string;
}

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url?: string | null;
}

interface Props {
  groupId: string;
  onClose: () => void;
}

const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "expert", label: "Expert" },
];

export default function GroupQuizPanel({ groupId, onClose }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<"list" | "create" | "play" | "results">("list");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [responses, setResponses] = useState<QuizResponse[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Create form
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState("5");

  // Play state
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);

  const fetchQuizzes = async () => {
    const { data } = await supabase.from("group_quizzes" as any).select("*")
      .eq("group_id", groupId).order("created_at", { ascending: false }).limit(20);
    setQuizzes((data || []) as any);
    setLoading(false);
  };

  const fetchResponses = async (quizId: string) => {
    const { data } = await supabase.from("group_quiz_responses" as any).select("*").eq("quiz_id", quizId);
    const resps = (data || []) as any as QuizResponse[];
    setResponses(resps);
    const ids = new Set(resps.map((r) => r.user_id));
    if (ids.size > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", Array.from(ids));
      if (profs) {
        const map: Record<string, Profile> = {};
        (profs as any[]).forEach((p) => { map[p.id] = p; });
        setProfiles(map);
      }
    }
  };

  useEffect(() => { fetchQuizzes(); }, [groupId]);

  // Realtime for responses
  useEffect(() => {
    if (!activeQuiz) return;
    const sub = supabase.channel(`quiz-${activeQuiz.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_quiz_responses", filter: `quiz_id=eq.${activeQuiz.id}` },
        () => { fetchResponses(activeQuiz.id); })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [activeQuiz?.id]);

  const handleGenerate = async () => {
    if (!subject.trim() || !topic.trim() || !user) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: { subject, topic, count: parseInt(count), difficulty },
      });
      if (error) throw error;
      const questions = data.questions;
      if (!questions?.length) throw new Error("No questions generated");

      const title = `${subject} - ${topic}`;
      const { data: quiz, error: insertErr } = await supabase.from("group_quizzes" as any).insert({
        group_id: groupId,
        title,
        subject,
        topic,
        difficulty,
        questions,
        created_by: user.id,
      }).select().single();
      if (insertErr) throw insertErr;

      toast({ title: "Quiz created!", description: "Group members can now take this quiz." });
      await fetchQuizzes();
      setMode("list");
      setSubject("");
      setTopic("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setCurrentQ(0);
    setSelected(null);
    setAnswers([]);
    setShowExplanation(false);
    setMode("play");
  };

  const viewResults = async (quiz: Quiz) => {
    setActiveQuiz(quiz);
    await fetchResponses(quiz.id);
    setMode("results");
  };

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    setShowExplanation(true);
  };

  const nextQuestion = async () => {
    if (!activeQuiz || selected === null) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);

    if (currentQ >= activeQuiz.questions.length - 1) {
      // Submit
      const score = newAnswers.filter((a, i) => a === activeQuiz.questions[i].correctIndex).length;
      await supabase.from("group_quiz_responses" as any).upsert({
        quiz_id: activeQuiz.id,
        user_id: user!.id,
        answers: newAnswers,
        score,
        total: activeQuiz.questions.length,
      }, { onConflict: "quiz_id,user_id" });
      await fetchResponses(activeQuiz.id);
      setMode("results");
    } else {
      setCurrentQ(currentQ + 1);
      setSelected(null);
      setShowExplanation(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  // CREATE
  if (mode === "create") {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setMode("list")}>← Back</Button>
          <Brain className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Create Group Quiz</span>
        </div>
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Subject</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Operating Systems" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Topic</label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Process Scheduling" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Difficulty</label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Questions</label>
            <Select value={count} onValueChange={setCount}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[3,5,8,10].map((n) => <SelectItem key={n} value={String(n)}>{n} questions</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={generating || !subject.trim() || !topic.trim()} className="w-full">
            {generating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating...</> : "Generate Quiz"}
          </Button>
        </div>
      </div>
    );
  }

  // PLAY
  if (mode === "play" && activeQuiz) {
    const q = activeQuiz.questions[currentQ];
    const progress = ((currentQ + 1) / activeQuiz.questions.length) * 100;
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">{activeQuiz.title}</span>
            <span className="text-xs text-muted-foreground">{currentQ + 1}/{activeQuiz.questions.length}</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-sm font-medium">{q.question}</p>
          <div className="space-y-2">
            {q.options.map((opt, i) => {
              let cls = "border border-border bg-card hover:bg-secondary";
              if (selected !== null) {
                if (i === q.correctIndex) cls = "border-green-500 bg-green-500/10";
                else if (i === selected) cls = "border-destructive bg-destructive/10";
              }
              return (
                <button key={i} onClick={() => handleAnswer(i)}
                  className={`w-full text-left p-3 rounded-lg text-sm transition-all flex items-center gap-2 ${cls}`}
                  disabled={selected !== null}>
                  {selected !== null && i === q.correctIndex && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                  {selected !== null && i === selected && i !== q.correctIndex && <XCircle className="w-4 h-4 text-destructive shrink-0" />}
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
          {showExplanation && (
            <div className="p-3 rounded-lg bg-muted text-xs text-muted-foreground">
              <strong>Explanation:</strong> {q.explanation}
            </div>
          )}
        </div>
        {selected !== null && (
          <div className="p-4 border-t border-border">
            <Button onClick={nextQuestion} className="w-full">
              {currentQ >= activeQuiz.questions.length - 1 ? "Finish & Submit" : <>Next <ArrowRight className="w-4 h-4 ml-1" /></>}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // RESULTS
  if (mode === "results" && activeQuiz) {
    const myResp = responses.find((r) => r.user_id === user?.id);
    const sorted = [...responses].sort((a, b) => b.score - a.score);
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setMode("list"); setActiveQuiz(null); }}>← Back</Button>
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span className="font-semibold text-sm">Leaderboard</span>
        </div>
        <div className="p-4 space-y-2 flex-1 overflow-y-auto">
          <p className="text-xs text-muted-foreground mb-3">{activeQuiz.title} · {activeQuiz.difficulty}</p>
          {sorted.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No one has taken this quiz yet.</p>}
          {sorted.map((r, i) => {
            const p = profiles[r.user_id];
            const pct = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
            return (
              <div key={r.id} className={`flex items-center gap-3 p-3 rounded-lg ${r.user_id === user?.id ? "bg-primary/10 border border-primary/20" : "bg-card border border-border"}`}>
                <span className={`text-sm font-bold w-6 text-center ${i === 0 ? "text-yellow-500" : i === 1 ? "text-muted-foreground" : "text-muted-foreground/60"}`}>
                  #{i + 1}
                </span>
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  {p?.avatar_url ? <img src={p.avatar_url} className="w-full h-full rounded-full object-cover" /> :
                    <span className="text-[10px] font-bold text-primary">{(p?.display_name || p?.username || "?")[0].toUpperCase()}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{p?.display_name || p?.username || "User"}</p>
                </div>
                <span className="text-sm font-bold">{pct}%</span>
                <span className="text-[10px] text-muted-foreground">{r.score}/{r.total}</span>
              </div>
            );
          })}
          {!myResp && (
            <div className="pt-4">
              <Button onClick={() => startQuiz(activeQuiz)} className="w-full">Take This Quiz</Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // LIST
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Group Quizzes</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
          <Button size="sm" onClick={() => setMode("create")}><Plus className="w-3.5 h-3.5 mr-1" /> New Quiz</Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {quizzes.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No quizzes yet</p>
            <p className="text-xs mt-1">Create a quiz and challenge your group!</p>
          </div>
        )}
        {quizzes.map((q) => (
          <div key={q.id} className="p-3 rounded-lg border border-border bg-card hover:bg-secondary/50 transition-all">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium truncate">{q.title}</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{q.difficulty}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">{(q.questions as any[]).length} questions · {new Date(q.created_at).toLocaleDateString()}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => startQuiz(q)}>Take Quiz</Button>
              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => viewResults(q)}>
                <Trophy className="w-3 h-3 mr-1" /> Leaderboard
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
