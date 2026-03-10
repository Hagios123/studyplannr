import { useMemo } from "react";
import { useStudyStore } from "@/stores/useStudyStore";
import { Brain, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

// Simple spaced repetition: cards not mastered, prioritize ones studied least recently
// For a real app you'd track last_reviewed timestamps - here we use a simple heuristic

export default function SpacedRepetitionCard() {
  const { flashcards } = useStudyStore();

  const dueCards = useMemo(() => {
    const unmastered = flashcards.filter((f) => !f.mastered);
    // Group by subject and pick cards to review
    const subjectGroups: Record<string, typeof unmastered> = {};
    unmastered.forEach((c) => {
      if (!subjectGroups[c.subject]) subjectGroups[c.subject] = [];
      subjectGroups[c.subject].push(c);
    });

    // Pick up to 3 subjects, 2 cards each
    const due: typeof unmastered = [];
    const subjects = Object.keys(subjectGroups).slice(0, 3);
    subjects.forEach((s) => {
      due.push(...subjectGroups[s].slice(0, 2));
    });
    return due;
  }, [flashcards]);

  if (dueCards.length === 0) return null;

  return (
    <Link
      to="/flashcards"
      className="block p-4 rounded-xl border border-accent/20 bg-accent/5 hover:border-accent/40 transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
          <Brain className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-display font-semibold text-sm">Review Due</p>
            <Sparkles className="w-3 h-3 text-accent animate-pulse" />
          </div>
          <p className="text-xs text-muted-foreground">
            {dueCards.length} flashcard{dueCards.length !== 1 ? "s" : ""} ready for review
          </p>
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {[...new Set(dueCards.map((c) => c.subject))].map((subject) => (
              <span
                key={subject}
                className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium"
              >
                {subject}
              </span>
            ))}
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0" />
      </div>
    </Link>
  );
}
