import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudyStore } from "@/stores/useStudyStore";
import { useGamificationStore } from "@/stores/useGamificationStore";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, BookOpen, Brain, GraduationCap, Loader2, Clock,
  CheckCircle2, Layers, HelpCircle, FileText, ArrowRight, Zap,
  ChevronDown, ChevronUp, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import ReactMarkdown from "react-markdown";

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

type Depth = "quick" | "comprehensive" | "deep";

export default function CourseGenerator() {
  const [topic, setTopic] = useState("");
  const [depth, setDepth] = useState<Depth>("comprehensive");
  const [loading, setLoading] = useState(false);
  const [course, setCourse] = useState<GeneratedCourse | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set());
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const { addSubjectConfig, addFlashcard, autoGenerateTasks } = useStudyStore();
  const { addXP, incrementStat } = useGamificationStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const generateCourse = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setCourse(null);
    setQuizAnswers({});
    setQuizSubmitted(false);

    try {
      const { data, error } = await supabase.functions.invoke("generate-course", {
        body: { topic: topic.trim(), depth },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.course) {
        setCourse(data.course);
        setActiveTab("overview");
        toast({ title: "🎓 Course generated!", description: `${data.course.title} is ready to study.` });
      }
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message || "Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
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
    const startDate = new Date().toISOString().split("T")[0];
    autoGenerateTasks(startDate, 14, [config]);
    toast({ title: "📅 Added to planner!", description: "Study tasks have been scheduled for the next 2 weeks." });
  };

  const importFlashcards = () => {
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
    toast({ title: "🃏 Flashcards imported!", description: `${course.flashcards.length} cards added.` });
  };

  const quizScore = course ? Object.entries(quizAnswers).filter(([i, a]) => a === course.quiz[Number(i)].correctIndex).length : 0;

  const handleSubmitQuiz = () => {
    setQuizSubmitted(true);
    if (course) {
      addXP("quiz_complete", `Scored ${quizScore}/${course.quiz.length} on ${course.title}`);
      incrementStat("quizzesCompleted");
    }
  };

  const depthOptions = [
    { value: "quick" as Depth, label: "Quick", desc: "3-5 topics, ~30 min", icon: Zap },
    { value: "comprehensive" as Depth, label: "Comprehensive", desc: "8-12 topics, ~2-4 hrs", icon: BookOpen },
    { value: "deep" as Depth, label: "Deep Dive", desc: "15+ topics, ~6-10 hrs", icon: Brain },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
          <GraduationCap className="w-6 h-6 md:w-7 md:h-7 text-primary" />
          AI Course Generator
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Enter any topic and get a complete study course with notes, flashcards, and quizzes
        </p>
      </div>

      {/* Input Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="e.g. Quantum Physics, Machine Learning, Roman History..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && generateCourse()}
              className="pl-10 h-12 text-base"
              disabled={loading}
            />
          </div>
          <Button onClick={generateCourse} disabled={loading || !topic.trim()} className="h-12 px-6 gap-2 font-display font-semibold">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? "Generating..." : "Generate Course"}
          </Button>
        </div>

        {/* Depth selector */}
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

      {/* Loading State */}
      {loading && (
        <div className="text-center py-16 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Brain className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <div>
            <p className="font-display font-semibold">Generating your course...</p>
            <p className="text-sm text-muted-foreground mt-1">AI is creating notes, flashcards, and quiz questions</p>
          </div>
          <Progress value={33} className="max-w-xs mx-auto h-1.5" />
        </div>
      )}

      {/* Generated Course */}
      {course && !loading && (
        <div className="space-y-4">
          {/* Course Header */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-display font-bold">{course.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{course.description}</p>
                <div className="flex flex-wrap gap-3 mt-3">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" /> ~{course.estimatedHours}h total
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <BookOpen className="w-3 h-3" /> {course.topics.length} topics
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Layers className="w-3 h-3" /> {course.flashcards.length} flashcards
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <HelpCircle className="w-3 h-3" /> {course.quiz.length} questions
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                    course.difficulty === "beginner" ? "bg-success/10 text-success" :
                    course.difficulty === "advanced" ? "bg-destructive/10 text-destructive" :
                    "bg-accent/10 text-accent"
                  }`}>
                    {course.difficulty}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={importToPlanner} className="gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5" /> Add to Planner
                </Button>
                <Button size="sm" variant="outline" onClick={importFlashcards} className="gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Import Cards
                </Button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="overview" className="gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Plan</TabsTrigger>
              <TabsTrigger value="notes" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Notes</TabsTrigger>
              <TabsTrigger value="flashcards" className="gap-1.5"><Layers className="w-3.5 h-3.5" /> Cards</TabsTrigger>
              <TabsTrigger value="quiz" className="gap-1.5"><HelpCircle className="w-3.5 h-3.5" /> Quiz</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-2 mt-4">
              {course.topics.sort((a, b) => a.order - b.order).map((t, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/20 transition-all">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-display font-bold text-primary shrink-0">
                    {i + 1}
                  </div>
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

            <TabsContent value="flashcards" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {course.flashcards.map((fc, i) => {
                  const isExpanded = expandedTopics.has(i);
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        const next = new Set(expandedTopics);
                        isExpanded ? next.delete(i) : next.add(i);
                        setExpandedTopics(next);
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

            <TabsContent value="quiz" className="mt-4 space-y-4">
              {course.quiz.map((q, qi) => (
                <div key={qi} className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <p className="font-medium text-sm">
                    <span className="text-primary font-display mr-2">Q{qi + 1}.</span>
                    {q.question}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, oi) => {
                      const selected = quizAnswers[qi] === oi;
                      const isCorrect = oi === q.correctIndex;
                      const showResult = quizSubmitted;
                      return (
                        <button
                          key={oi}
                          onClick={() => !quizSubmitted && setQuizAnswers((prev) => ({ ...prev, [qi]: oi }))}
                          disabled={quizSubmitted}
                          className={`text-left p-3 rounded-lg border text-sm transition-all ${
                            showResult && isCorrect
                              ? "border-success bg-success/10 text-success"
                              : showResult && selected && !isCorrect
                              ? "border-destructive bg-destructive/10 text-destructive"
                              : selected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/30"
                          }`}
                        >
                          <span className="font-display font-semibold mr-2">{String.fromCharCode(65 + oi)}.</span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {quizSubmitted && (
                    <p className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded-lg">
                      💡 {q.explanation}
                    </p>
                  )}
                </div>
              ))}
              {course.quiz.length > 0 && (
                <div className="flex items-center justify-between">
                  {!quizSubmitted ? (
                    <Button onClick={handleSubmitQuiz} disabled={Object.keys(quizAnswers).length < course.quiz.length} className="gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Submit Quiz
                    </Button>
                  ) : (
                    <div className="flex items-center gap-4">
                      <p className="font-display font-bold text-lg">
                        Score: {quizScore}/{course.quiz.length}
                        <span className="text-sm text-muted-foreground ml-2">
                          ({Math.round((quizScore / course.quiz.length) * 100)}%)
                        </span>
                      </p>
                      <Button variant="outline" size="sm" onClick={() => { setQuizAnswers({}); setQuizSubmitted(false); }}>
                        Retry
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
