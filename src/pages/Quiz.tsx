import { useState } from "react";
import { useStudyStore } from "@/stores/useStudyStore";
import { HelpCircle, Check, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Quiz() {
  const { quizQuestions } = useStudyStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = quizQuestions[currentIndex];

  const handleSelect = (idx: number) => {
    if (showResult) return;
    setSelected(idx);
    setShowResult(true);
    if (idx === q.correctIndex) setScore((s) => s + 1);
  };

  const next = () => {
    if (currentIndex + 1 >= quizQuestions.length) {
      setFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelected(null);
      setShowResult(false);
    }
  };

  const restart = () => {
    setCurrentIndex(0);
    setSelected(null);
    setShowResult(false);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    const pct = Math.round((score / quizQuestions.length) * 100);
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
            You answered {score} out of {quizQuestions.length} questions correctly.
          </p>
          <Button onClick={restart} className="gap-2"><RotateCcw className="w-4 h-4" /> Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-primary" /> Quiz
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Question {currentIndex + 1} of {quizQuestions.length} · Score: {score}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${((currentIndex + 1) / quizQuestions.length) * 100}%` }}
        />
      </div>

      <div className="max-w-2xl mx-auto space-y-6 py-4">
        <div className="space-y-2">
          <span className="text-xs text-primary font-medium uppercase tracking-wider">{q.subject}</span>
          <h2 className="text-xl font-display font-semibold">{q.question}</h2>
        </div>

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

        {showResult && (
          <div className="flex justify-end">
            <Button onClick={next}>
              {currentIndex + 1 >= quizQuestions.length ? "See Results" : "Next Question"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
