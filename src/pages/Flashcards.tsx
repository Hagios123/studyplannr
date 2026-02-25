import { useState } from "react";
import { useStudyStore } from "@/stores/useStudyStore";
import { Layers, RotateCw, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Flashcards() {
  const { flashcards, toggleFlashcardMastered } = useStudyStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [filter, setFilter] = useState<"all" | "unmastered">("unmastered");

  const filtered = filter === "unmastered" ? flashcards.filter((f) => !f.mastered) : flashcards;
  const card = filtered[currentIndex];

  const next = () => {
    setFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % filtered.length);
  };
  const prev = () => {
    setFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" /> Flashcards
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {filtered.length} cards · {flashcards.filter((f) => f.mastered).length} mastered
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant={filter === "unmastered" ? "default" : "outline"} size="sm" onClick={() => { setFilter("unmastered"); setCurrentIndex(0); setFlipped(false); }}>
            To Review
          </Button>
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => { setFilter("all"); setCurrentIndex(0); setFlipped(false); }}>
            All
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Check className="w-12 h-12 mx-auto mb-3 text-success" />
          <p className="font-display font-semibold text-lg">All cards mastered!</p>
          <p className="text-sm mt-1">Great job! Switch to "All" to review again.</p>
        </div>
      ) : (
        <>
          {/* Card */}
          <div
            onClick={() => setFlipped(!flipped)}
            className="relative cursor-pointer mx-auto max-w-lg"
            style={{ perspective: "1000px" }}
          >
            <div
              className="relative w-full min-h-[280px] transition-transform duration-500"
              style={{
                transformStyle: "preserve-3d",
                transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* Front */}
              <div
                className="absolute inset-0 bg-card border border-border rounded-2xl p-8 flex flex-col items-center justify-center text-center"
                style={{ backfaceVisibility: "hidden" }}
              >
                <span className="text-xs text-primary font-medium uppercase tracking-wider mb-4">{card.subject}</span>
                <p className="text-xl font-display font-semibold leading-relaxed">{card.front}</p>
                <p className="text-xs text-muted-foreground mt-6 flex items-center gap-1">
                  <RotateCw className="w-3 h-3" /> Tap to reveal
                </p>
              </div>
              {/* Back */}
              <div
                className="absolute inset-0 bg-primary/5 border border-primary/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              >
                <span className="text-xs text-accent font-medium uppercase tracking-wider mb-4">Answer</span>
                <p className="text-lg leading-relaxed">{card.back}</p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" size="icon" onClick={prev}><ChevronLeft className="w-5 h-5" /></Button>
            <span className="text-sm text-muted-foreground tabular-nums">{currentIndex + 1} / {filtered.length}</span>
            <Button variant="outline" size="icon" onClick={next}><ChevronRight className="w-5 h-5" /></Button>
          </div>
          <div className="flex justify-center">
            <Button
              variant={card.mastered ? "outline" : "default"}
              onClick={() => toggleFlashcardMastered(card.id)}
              className="gap-2"
            >
              <Check className="w-4 h-4" />
              {card.mastered ? "Unmark Mastered" : "Mark as Mastered"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
