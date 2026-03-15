import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudyStore } from "@/stores/useStudyStore";
import { useGamificationStore } from "@/stores/useGamificationStore";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles, BookOpen, Brain, GraduationCap, Loader2, Clock,
  CheckCircle2, Layers, HelpCircle, FileText, ArrowRight, Zap,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, RotateCw,
  RotateCcw, Check, X, Timer, AlertTriangle, Shuffle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import ReactMarkdown from "react-markdown";

/* ─── Types ─── */
interface GeneratedCourse {
  title: string;
  description: string;
  estimatedHours: number;
  difficulty: string;
  topics: { name: string; duration: number; order: number }[];
  notes: string;
  flashcards: { front: string; back: string; topic: string }[];
  quiz: { question: string; options: string[]; correctIndex: number; explanation: string; topic: string }[];
}

interface AIQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

type Depth = "quick" | "comprehensive" | "deep";
type QuizDifficulty = "very-easy" | "easy" | "medium" | "hard" | "expert";
type FlashcardDifficulty = "easy" | "medium" | "hard" | "expert";

const QUIZ_DIFF: Record<QuizDifficulty, { label: string; color: string; desc: string }> = {
  "very-easy": { label: "Very Easy", color: "bg-success/20 text-success", desc: "Basic recall" },
  easy: { label: "Easy", color: "bg-success/10 text-success", desc: "Simple understanding" },
  medium: { label: "Medium", color: "bg-accent/10 text-accent", desc: "Application-level" },
  hard: { label: "Hard", color: "bg-destructive/10 text-destructive", desc: "Analysis" },
  expert: { label: "Expert", color: "bg-destructive/20 text-destructive", desc: "Critical thinking" },
};

const FC_DIFF: Record<FlashcardDifficulty, { label: string; color: string }> = {
  easy: { label: "Easy", color: "bg-success/10 text-success" },
  medium: { label: "Medium", color: "bg-accent/10 text-accent" },
  hard: { label: "Hard", color: "bg-destructive/10 text-destructive" },
  expert: { label: "Expert", color: "bg-destructive/20 text-destructive" },
};

const depthOptions: { value: Depth; label: string; desc: string; icon: any }[] = [
  { value: "quick", label: "Quick", desc: "~30 min", icon: Zap },
  { value: "comprehensive", label: "Full", desc: "~2-4 hrs", icon: BookOpen },
  { value: "deep", label: "Deep Dive", desc: "~6-10 hrs", icon: Brain },
];

/* ─── Component ─── */
export default function Learn() {
  const [mainTab, setMainTab] = useState("generate");
  const { toast } = useToast();
  const { subjectConfigs, subjects, flashcards, addFlashcard, toggleFlashcardMastered, tasks, autoGenerateTasks, addSubjectConfig } = useStudyStore();
  const { addXP, incrementStat, recordStreak } = useGamificationStore();
  const allSubjects = [...new Set([...subjects, ...subjectConfigs.map((s) => s.name)])];

  /* ═══ GENERATE TAB ═══ */
  const [topic, setTopic] = useState("");
  const [depth, setDepth] = useState<Depth>("comprehensive");
  const [genLoading, setGenLoading] = useState(false);
  const [course, setCourse] = useState<GeneratedCourse | null>(null);
  const [courseTab, setCourseTab] = useState("overview");
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [courseQuizAnswers, setCourseQuizAnswers] = useState<Record<number, number>>({});
  const [courseQuizSubmitted, setCourseQuizSubmitted] = useState(false);

  const generateCourse = async () => {
    if (!topic.trim()) return;
    setGenLoading(true);
    setCourse(null);
    setCourseQuizAnswers({});
    setCourseQuizSubmitted(false);
    try {
      const { data, error } = await supabase.functions.invoke("generate-course", {
        body: { topic: topic.trim(), depth },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.course) {
        setCourse(data.course);
        setCourseTab("overview");
        toast({ title: "🎓 Course generated!", description: `${data.course.title} is ready.` });
      }
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message || "Try again.", variant: "destructive" });
    } finally {
      setGenLoading(false);
    }
  };

  const importToPlanner = () => {
    if (!course) return;
    const config = {
      name: course.title,
      difficulty: course.difficulty === "beginner" ? "easy" as const : course.difficulty === "advanced" ? "hard" as const : "moderate" as const,
      topics: course.topics.map((t) => t.name),
    };
    addSubjectConfig(config);
    autoGenerateTasks(new Date().toISOString().split("T")[0], 14, [config]);
    toast({ title: "📅 Added to planner!" });
  };

  const importCourseFlashcards = () => {
    if (!course) return;
    course.flashcards.forEach((fc, i) => {
      addFlashcard({
        id: `course-${Date.now()}-${i}`,
        subject: course.title,
        topic: fc.topic,
        front: fc.front,
        back: fc.back,
        mastered: false,
      });
    });
    addXP("flashcard_master", `Imported ${course.flashcards.length} flashcards`);
    toast({ title: "🃏 Flashcards imported!", description: `${course.flashcards.length} cards added to your collection.` });
    setMainTab("flashcards");
  };

  const courseQuizScore = course
    ? Object.entries(courseQuizAnswers).filter(([i, a]) => a === course.quiz[Number(i)].correctIndex).length
    : 0;

  /* ═══ FLASHCARDS TAB ═══ */
  const [fcIndex, setFcIndex] = useState(0);
  const [fcFlipped, setFcFlipped] = useState(false);
  const [fcFilter, setFcFilter] = useState<"all" | "unmastered">("all");
  const [fcShuffled, setFcShuffled] = useState(false);
  const [fcGenSubject, setFcGenSubject] = useState("");
  const [fcGenTopic, setFcGenTopic] = useState("");
  const [fcCustomSubject, setFcCustomSubject] = useState("");
  const [fcCustomTopic, setFcCustomTopic] = useState("");
  const [fcGenCount, setFcGenCount] = useState(5);
  const [fcGenDiff, setFcGenDiff] = useState<FlashcardDifficulty>("medium");
  const [fcGenerating, setFcGenerating] = useState(false);
  const [fcGenOpen, setFcGenOpen] = useState(false);

  const userCards = useMemo(() => flashcards.filter((f) => f.id.startsWith("ai-") || f.id.startsWith("sched-") || f.id.startsWith("course-")), [flashcards]);

  const filteredCards = useMemo(() => {
    let cards = fcFilter === "unmastered" ? userCards.filter((f) => !f.mastered) : userCards;
    if (fcShuffled) {
      const arr = [...cards];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
    return cards;
  }, [fcFilter, userCards, fcShuffled]);

  const fcCard = filteredCards[fcIndex];
  const fcNext = useCallback(() => { setFcFlipped(false); setFcIndex((p) => (p + 1) % filteredCards.length); }, [filteredCards.length]);
  const fcPrev = useCallback(() => { setFcFlipped(false); setFcIndex((p) => (p - 1 + filteredCards.length) % filteredCards.length); }, [filteredCards.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (mainTab !== "flashcards" || filteredCards.length === 0) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") fcNext();
      else if (e.key === "ArrowLeft") fcPrev();
      else if (e.key === " ") { e.preventDefault(); setFcFlipped((f) => !f); }
      else if ((e.key === "m" || e.key === "M") && fcCard) toggleFlashcardMastered(fcCard.id);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fcNext, fcPrev, fcCard, filteredCards.length, toggleFlashcardMastered, mainTab]);

  const fcEffectiveSubject = fcGenSubject === "__custom__" ? fcCustomSubject : fcGenSubject;
  const fcEffectiveTopic = fcGenTopic === "__custom_topic__" ? fcCustomTopic : (fcGenTopic || fcCustomTopic || fcEffectiveSubject);
  const fcSelectedConfig = subjectConfigs.find((s) => s.name === fcGenSubject);

  const generateFlashcards = async () => {
    if (!fcEffectiveSubject) return;
    setFcGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: { subject: fcEffectiveSubject, topic: fcEffectiveTopic, count: fcGenCount, type: "flashcards", difficulty: fcGenDiff },
      });
      if (error) throw error;
      if (data?.error) { toast({ title: "AI Error", description: data.error, variant: "destructive" }); setFcGenerating(false); return; }
      const cards = data?.flashcards || data?.questions || [];
      if (cards.length === 0) { toast({ title: "No cards generated", variant: "destructive" }); setFcGenerating(false); return; }
      cards.forEach((c: any) => {
        addFlashcard({
          id: `ai-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          subject: fcEffectiveSubject,
          topic: fcEffectiveTopic,
          front: c.front || c.question,
          back: c.back || c.explanation || c.options?.[c.correctIndex] || "",
          mastered: false,
        });
      });
      toast({ title: "Flashcards generated!", description: `${cards.length} new cards added` });
      setFcGenOpen(false);
      setFcFilter("all");
      setFcIndex(0);
      setFcFlipped(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setFcGenerating(false);
  };

  /* ═══ QUIZ TAB ═══ */
  const [quizMode, setQuizMode] = useState<"select" | "playing" | "finished">("select");
  const [quizQuestions, setQuizQuestions] = useState<AIQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [quizShowResult, setQuizShowResult] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizSubject, setQuizSubject] = useState("");
  const [quizTopic, setQuizTopic] = useState("");
  const [quizCustomSubject, setQuizCustomSubject] = useState("");
  const [quizCustomTopic, setQuizCustomTopic] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [quizDifficulty, setQuizDifficulty] = useState<QuizDifficulty>("medium");
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  const quizEffectiveSubject = quizSubject === "__custom__" ? quizCustomSubject : quizSubject;
  const quizSc = subjectConfigs.find((s) => s.name === quizSubject);

  useEffect(() => {
    if (!timerRunning || !timerEnabled || quizMode !== "playing") return;
    if (timerSeconds <= 0) { setQuizMode("finished"); setTimerRunning(false); return; }
    const interval = setInterval(() => {
      setTimerSeconds((s) => {
        if (s <= 1) { setTimerRunning(false); setQuizMode("finished"); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timerEnabled, quizMode, timerSeconds]);

  const generateQuiz = async (subject: string, topicStr: string) => {
    setQuizLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: { subject, topic: topicStr, count: questionCount, difficulty: quizDifficulty },
      });
      if (error) throw error;
      if (data?.error) { toast({ title: "AI Error", description: data.error, variant: "destructive" }); setQuizLoading(false); return; }
      if (data?.questions?.length > 0) {
        setQuizQuestions(data.questions);
        setQuizIndex(0);
        setQuizSelected(null);
        setQuizShowResult(false);
        setQuizScore(0);
        setQuizMode("playing");
        if (timerEnabled) { setTimerSeconds(timerMinutes * 60); setTimerRunning(true); }
      } else {
        toast({ title: "No questions generated", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setQuizLoading(false);
  };

  const handleQuizSelect = (idx: number) => {
    if (quizShowResult) return;
    setQuizSelected(idx);
    setQuizShowResult(true);
    if (idx === quizQuestions[quizIndex].correctIndex) setQuizScore((s) => s + 1);
  };

  const quizNext = () => {
    if (quizIndex + 1 >= quizQuestions.length) { setQuizMode("finished"); setTimerRunning(false); }
    else { setQuizIndex((i) => i + 1); setQuizSelected(null); setQuizShowResult(false); }
  };

  const formatTime = (t: number) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;

  /* ═══ RENDER ═══ */
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
          <GraduationCap className="w-6 h-6 md:w-7 md:h-7 text-primary" />
          Learn
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Generate courses, study flashcards, and take quizzes — all in one place
        </p>
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="generate" className="gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Generate</TabsTrigger>
          <TabsTrigger value="flashcards" className="gap-1.5"><Layers className="w-3.5 h-3.5" /> Flashcards</TabsTrigger>
          <TabsTrigger value="quiz" className="gap-1.5"><HelpCircle className="w-3.5 h-3.5" /> Quiz</TabsTrigger>
        </TabsList>

        {/* ═══ GENERATE TAB ═══ */}
        <TabsContent value="generate" className="space-y-6 mt-4">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="e.g. Quantum Physics, Machine Learning, Roman History..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !genLoading && generateCourse()}
                  className="pl-10 h-12 text-base"
                  disabled={genLoading}
                />
              </div>
              <Button onClick={generateCourse} disabled={genLoading || !topic.trim()} className="h-12 px-6 gap-2 font-display font-semibold">
                {genLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {genLoading ? "Generating..." : "Generate Course"}
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {depthOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDepth(opt.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all duration-200 ${
                    depth === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <opt.icon className="w-4 h-4" />
                  <span className="font-semibold">{opt.label}</span>
                  <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {genLoading && (
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Brain className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <p className="font-display font-semibold">Generating your course...</p>
              <p className="text-sm text-muted-foreground">Creating notes, flashcards, and quiz questions</p>
              <Progress value={33} className="max-w-xs mx-auto h-1.5" />
            </div>
          )}

          {course && !genLoading && (
            <div className="space-y-4">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-display font-bold">{course.title}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{course.description}</p>
                    <div className="flex flex-wrap gap-3 mt-3">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" /> ~{course.estimatedHours}h</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><BookOpen className="w-3 h-3" /> {course.topics.length} topics</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><Layers className="w-3 h-3" /> {course.flashcards.length} cards</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><HelpCircle className="w-3 h-3" /> {course.quiz.length} questions</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={importToPlanner} className="gap-1.5"><ArrowRight className="w-3.5 h-3.5" /> Planner</Button>
                    <Button size="sm" variant="outline" onClick={importCourseFlashcards} className="gap-1.5"><Layers className="w-3.5 h-3.5" /> Import Cards</Button>
                  </div>
                </div>
              </div>

              <Tabs value={courseTab} onValueChange={setCourseTab}>
                <TabsList className="w-full grid grid-cols-4">
                  <TabsTrigger value="overview" className="gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Plan</TabsTrigger>
                  <TabsTrigger value="notes" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Notes</TabsTrigger>
                  <TabsTrigger value="cards" className="gap-1.5"><Layers className="w-3.5 h-3.5" /> Cards</TabsTrigger>
                  <TabsTrigger value="test" className="gap-1.5"><HelpCircle className="w-3.5 h-3.5" /> Quiz</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-2 mt-4">
                  {course.topics.sort((a, b) => a.order - b.order).map((t, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/20 transition-all">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-display font-bold text-primary shrink-0">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.duration} min</p>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="notes" className="mt-4">
                  <div className="rounded-xl border border-border bg-card p-6 prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{course.notes}</ReactMarkdown>
                  </div>
                </TabsContent>

                <TabsContent value="cards" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {course.flashcards.map((fc, i) => {
                      const isExpanded = expandedCards.has(i);
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            const next = new Set(expandedCards);
                            isExpanded ? next.delete(i) : next.add(i);
                            setExpandedCards(next);
                          }}
                          className="text-left p-4 rounded-xl border border-border bg-card hover:border-primary/20 transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium">{fc.front}</p>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                          </div>
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <p className="text-sm text-muted-foreground">{fc.back}</p>
                              <span className="text-[10px] text-primary mt-2 inline-block">{fc.topic}</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="test" className="mt-4 space-y-4">
                  {course.quiz.map((q, qi) => (
                    <div key={qi} className="p-4 rounded-xl border border-border bg-card space-y-3">
                      <p className="font-medium text-sm"><span className="text-primary font-display mr-2">Q{qi + 1}.</span>{q.question}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, oi) => {
                          const selected = courseQuizAnswers[qi] === oi;
                          const isCorrect = oi === q.correctIndex;
                          const show = courseQuizSubmitted;
                          return (
                            <button
                              key={oi}
                              onClick={() => !courseQuizSubmitted && setCourseQuizAnswers((p) => ({ ...p, [qi]: oi }))}
                              disabled={courseQuizSubmitted}
                              className={`text-left p-3 rounded-lg border text-sm transition-all ${
                                show && isCorrect ? "border-success bg-success/10 text-success"
                                : show && selected && !isCorrect ? "border-destructive bg-destructive/10 text-destructive"
                                : selected ? "border-primary bg-primary/10 text-primary"
                                : "border-border hover:border-primary/30"
                              }`}
                            >
                              <span className="font-display font-semibold mr-2">{String.fromCharCode(65 + oi)}.</span>{opt}
                            </button>
                          );
                        })}
                      </div>
                      {courseQuizSubmitted && <p className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded-lg">💡 {q.explanation}</p>}
                    </div>
                  ))}
                  {course.quiz.length > 0 && (
                    <div className="flex items-center justify-between">
                      {!courseQuizSubmitted ? (
                        <Button
                          onClick={() => { setCourseQuizSubmitted(true); addXP("quiz_complete", `Scored ${courseQuizScore}/${course.quiz.length}`); incrementStat("quizzesCompleted"); }}
                          disabled={Object.keys(courseQuizAnswers).length < course.quiz.length}
                          className="gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Submit Quiz
                        </Button>
                      ) : (
                        <div className="flex items-center gap-4">
                          <p className="font-display font-bold text-lg">
                            Score: {courseQuizScore}/{course.quiz.length}
                            <span className="text-sm text-muted-foreground ml-2">({Math.round((courseQuizScore / course.quiz.length) * 100)}%)</span>
                          </p>
                          <Button variant="outline" size="sm" onClick={() => { setCourseQuizAnswers({}); setCourseQuizSubmitted(false); }}>Retry</Button>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </TabsContent>

        {/* ═══ FLASHCARDS TAB ═══ */}
        <TabsContent value="flashcards" className="space-y-6 mt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {filteredCards.length} cards · {userCards.filter((f) => f.mastered).length} mastered
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={() => setFcGenOpen(!fcGenOpen)} className="gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> AI Generate
              </Button>
              <Button variant={fcShuffled ? "default" : "outline"} size="sm" onClick={() => { setFcShuffled(!fcShuffled); setFcIndex(0); setFcFlipped(false); }} className="gap-1.5">
                <Shuffle className="w-3 h-3" /> Shuffle
              </Button>
              <Button variant={fcFilter === "unmastered" ? "default" : "outline"} size="sm" onClick={() => { setFcFilter(fcFilter === "unmastered" ? "all" : "unmastered"); setFcIndex(0); setFcFlipped(false); }}>
                {fcFilter === "unmastered" ? "Show All" : "To Review"}
              </Button>
            </div>
          </div>

          {fcGenOpen && (
            <div className="p-5 rounded-xl border border-border bg-card space-y-4">
              <h3 className="font-display font-semibold text-sm">Generate AI Flashcards</h3>
              <Select value={fcGenSubject} onValueChange={(v) => { setFcGenSubject(v); setFcGenTopic(""); }}>
                <SelectTrigger><SelectValue placeholder="Choose subject" /></SelectTrigger>
                <SelectContent>
                  {allSubjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  <SelectItem value="__custom__">+ Custom subject...</SelectItem>
                </SelectContent>
              </Select>
              {fcGenSubject === "__custom__" && <Input placeholder="Enter subject..." value={fcCustomSubject} onChange={(e) => setFcCustomSubject(e.target.value)} />}
              {fcSelectedConfig && fcSelectedConfig.topics.length > 0 && (
                <Select value={fcGenTopic} onValueChange={setFcGenTopic}>
                  <SelectTrigger><SelectValue placeholder="Choose topic" /></SelectTrigger>
                  <SelectContent>
                    {fcSelectedConfig.topics.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    <SelectItem value="__custom_topic__">+ Custom topic...</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {(fcGenSubject === "__custom__" || fcGenTopic === "__custom_topic__" || (!fcSelectedConfig && fcGenSubject)) && (
                <Input placeholder="Enter topic..." value={fcCustomTopic} onChange={(e) => setFcCustomTopic(e.target.value)} />
              )}
              <div className="flex items-center gap-3">
                <label className="text-sm text-muted-foreground">Cards:</label>
                <Input type="number" min={1} max={20} value={fcGenCount} onChange={(e) => setFcGenCount(Number(e.target.value))} className="w-20" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Difficulty</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(Object.keys(FC_DIFF) as FlashcardDifficulty[]).map((d) => (
                    <button key={d} onClick={() => setFcGenDiff(d)} className={`text-xs font-medium px-2 py-2 rounded-lg border transition-all ${fcGenDiff === d ? `${FC_DIFF[d].color} border-current` : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/30"}`}>
                      {FC_DIFF[d].label}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={generateFlashcards} disabled={!fcEffectiveSubject || fcGenerating} className="w-full gap-2">
                {fcGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate Flashcards
              </Button>
            </div>
          )}

          {filteredCards.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-display font-semibold text-lg">{userCards.length === 0 ? "No flashcards yet" : "All cards mastered!"}</p>
              <p className="text-sm mt-1">{userCards.length === 0 ? "Generate a course or use AI Generate to create flashcards." : "Great job! Switch filter to see all."}</p>
            </div>
          ) : (
            <>
              <div onClick={() => setFcFlipped(!fcFlipped)} className="relative cursor-pointer mx-auto max-w-lg" style={{ perspective: "1000px" }}>
                <div className="relative w-full min-h-[280px] transition-transform duration-500" style={{ transformStyle: "preserve-3d", transform: fcFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
                  <div className="absolute inset-0 bg-card border border-border rounded-2xl p-8 flex flex-col items-center justify-center text-center" style={{ backfaceVisibility: "hidden" }}>
                    <span className="text-xs text-primary font-medium uppercase tracking-wider mb-4">{fcCard.subject}</span>
                    <p className="text-xl font-display font-semibold leading-relaxed">{fcCard.front}</p>
                    <p className="text-xs text-muted-foreground mt-6 flex items-center gap-1"><RotateCw className="w-3 h-3" /> Tap to reveal</p>
                  </div>
                  <div className="absolute inset-0 bg-primary/5 border border-primary/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                    <span className="text-xs text-accent font-medium uppercase tracking-wider mb-4">Answer</span>
                    <p className="text-lg leading-relaxed">{fcCard.back}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-4">
                <Button variant="outline" size="icon" onClick={fcPrev}><ChevronLeft className="w-5 h-5" /></Button>
                <span className="text-sm text-muted-foreground tabular-nums">{fcIndex + 1} / {filteredCards.length}</span>
                <Button variant="outline" size="icon" onClick={fcNext}><ChevronRight className="w-5 h-5" /></Button>
              </div>
              <div className="flex justify-center">
                <Button variant={fcCard.mastered ? "outline" : "default"} onClick={() => {
                  if (!fcCard.mastered) { addXP("flashcard_master", `Mastered: ${fcCard.front.slice(0, 30)}`); incrementStat("flashcardsMastered"); recordStreak(new Date().toISOString().split("T")[0]); }
                  toggleFlashcardMastered(fcCard.id);
                }} className="gap-2">
                  <Check className="w-4 h-4" /> {fcCard.mastered ? "Unmark Mastered" : "Mark as Mastered"}
                </Button>
              </div>
              <p className="text-center text-[10px] text-muted-foreground hidden md:block">← → navigate · Space flip · M mark mastered</p>
            </>
          )}
        </TabsContent>

        {/* ═══ QUIZ TAB ═══ */}
        <TabsContent value="quiz" className="space-y-6 mt-4">
          {quizMode === "select" && (
            <div className="max-w-md space-y-4 p-6 rounded-xl border border-border bg-card">
              <h3 className="font-display font-semibold">Generate AI Quiz</h3>
              <Select value={quizSubject} onValueChange={(v) => { setQuizSubject(v); setQuizTopic(""); }}>
                <SelectTrigger><SelectValue placeholder="Choose subject" /></SelectTrigger>
                <SelectContent>
                  {allSubjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  <SelectItem value="__custom__">+ Custom subject...</SelectItem>
                </SelectContent>
              </Select>
              {quizSubject === "__custom__" && <Input placeholder="Enter subject..." value={quizCustomSubject} onChange={(e) => setQuizCustomSubject(e.target.value)} />}
              {quizSc && quizSc.topics.length > 0 && (
                <Select value={quizTopic} onValueChange={setQuizTopic}>
                  <SelectTrigger><SelectValue placeholder="Choose topic" /></SelectTrigger>
                  <SelectContent>
                    {quizSc.topics.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    <SelectItem value="__custom_topic__">+ Custom topic...</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {(quizSubject === "__custom__" || quizTopic === "__custom_topic__" || (!quizSc && quizSubject)) && (
                <Input placeholder="Enter topic..." value={quizCustomTopic} onChange={(e) => setQuizCustomTopic(e.target.value)} />
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Questions: {questionCount}</label>
                </div>
                <Slider value={[questionCount]} onValueChange={([v]) => setQuestionCount(v)} min={3} max={20} step={1} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Difficulty</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(Object.keys(QUIZ_DIFF) as QuizDifficulty[]).map((d) => (
                    <button key={d} onClick={() => setQuizDifficulty(d)} className={`text-[10px] font-medium px-1.5 py-2 rounded-lg border transition-all ${quizDifficulty === d ? `${QUIZ_DIFF[d].color} border-current` : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/30"}`}>
                      {QUIZ_DIFF[d].label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">{QUIZ_DIFF[quizDifficulty].desc}</p>
              </div>
              <div className="space-y-3 p-3 rounded-lg bg-secondary/50 border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><Timer className="w-4 h-4 text-muted-foreground" /><span className="text-sm font-medium">Quiz Timer</span></div>
                  <Switch checked={timerEnabled} onCheckedChange={setTimerEnabled} />
                </div>
                {timerEnabled && (
                  <div className="flex items-center gap-2">
                    <Input type="number" value={timerMinutes} onChange={(e) => setTimerMinutes(Math.max(1, Math.min(120, parseInt(e.target.value) || 1)))} className="w-20" min={1} max={120} />
                    <span className="text-sm text-muted-foreground">minutes</span>
                  </div>
                )}
              </div>
              <Button
                onClick={() => {
                  const t = quizTopic === "__custom_topic__" ? quizCustomTopic : (quizTopic || quizCustomTopic || quizEffectiveSubject);
                  generateQuiz(quizEffectiveSubject, t);
                }}
                disabled={!quizEffectiveSubject || quizLoading}
                className="w-full gap-2"
              >
                {quizLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate Quiz
              </Button>
            </div>
          )}

          {quizMode === "playing" && (() => {
            const q = quizQuestions[quizIndex];
            return (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">Question {quizIndex + 1} of {quizQuestions.length} · Score: {quizScore}</p>
                  {timerEnabled && (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-display font-bold tabular-nums text-lg ${timerSeconds < 30 ? "border-destructive/30 bg-destructive/10 text-destructive animate-pulse" : "border-border bg-card text-foreground"}`}>
                      <Timer className="w-4 h-4" /> {formatTime(timerSeconds)}
                    </div>
                  )}
                </div>
                <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${((quizIndex + 1) / quizQuestions.length) * 100}%` }} />
                </div>
                <div className="max-w-2xl mx-auto space-y-6 py-4">
                  <h2 className="text-xl font-display font-semibold">{q.question}</h2>
                  <div className="space-y-3">
                    {q.options.map((opt, idx) => {
                      let style = "bg-card border-border hover:border-primary/30";
                      if (quizShowResult) {
                        if (idx === q.correctIndex) style = "bg-success/10 border-success/30";
                        else if (idx === quizSelected) style = "bg-destructive/10 border-destructive/30";
                        else style = "bg-card border-border opacity-50";
                      }
                      return (
                        <button key={idx} onClick={() => handleQuizSelect(idx)} className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 ${style}`} disabled={quizShowResult}>
                          <span className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-sm font-display font-bold shrink-0">{String.fromCharCode(65 + idx)}</span>
                          <span className="flex-1 font-medium text-sm">{opt}</span>
                          {quizShowResult && idx === q.correctIndex && <Check className="w-5 h-5 text-success" />}
                          {quizShowResult && idx === quizSelected && idx !== q.correctIndex && <X className="w-5 h-5 text-destructive" />}
                        </button>
                      );
                    })}
                  </div>
                  {quizShowResult && q.explanation && (
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                      <p className="font-medium text-primary mb-1">Explanation</p>
                      <p className="text-muted-foreground">{q.explanation}</p>
                    </div>
                  )}
                  {quizShowResult && (
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => { setQuizMode("select"); setTimerRunning(false); }}>Exit</Button>
                      <Button onClick={quizNext}>{quizIndex + 1 >= quizQuestions.length ? "See Results" : "Next Question"}</Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {quizMode === "finished" && (() => {
            const pct = Math.round((quizScore / quizQuestions.length) * 100);
            return (
              <div className="max-w-md mx-auto text-center py-12 space-y-6">
                {timerEnabled && timerSeconds <= 0 && (
                  <div className="flex items-center justify-center gap-2 text-accent text-sm"><AlertTriangle className="w-4 h-4" /> Time's up!</div>
                )}
                <div className={`text-7xl font-display font-bold ${pct >= 70 ? "text-gradient-primary" : "text-accent"}`}>{pct}%</div>
                <p className="text-lg text-muted-foreground">You answered {quizScore} out of {quizQuestions.length} correctly.</p>
                <p className="text-sm text-muted-foreground">
                  Difficulty: <span className={`px-2 py-0.5 rounded-full text-xs ${QUIZ_DIFF[quizDifficulty].color}`}>{QUIZ_DIFF[quizDifficulty].label}</span>
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => setQuizMode("select")} variant="outline" className="gap-2"><RotateCcw className="w-4 h-4" /> New Quiz</Button>
                  <Button onClick={() => {
                    setQuizIndex(0); setQuizSelected(null); setQuizShowResult(false); setQuizScore(0); setQuizMode("playing");
                    if (timerEnabled) { setTimerSeconds(timerMinutes * 60); setTimerRunning(true); }
                  }} className="gap-2"><RotateCcw className="w-4 h-4" /> Retry</Button>
                </div>
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
