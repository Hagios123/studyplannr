import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Timer,
  Layers,
  HelpCircle,
  MessageSquare,
  BarChart3,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ONBOARDING_KEY = "novastudy_onboarding_complete";

interface TutorialStep {
  icon: React.ElementType;
  title: string;
  description: string;
  tip: string;
  color: string;
}

const steps: TutorialStep[] = [
  {
    icon: Rocket,
    title: "Welcome to Study AI",
    description:
      "Your AI-powered study command center. Let's take a quick tour of all the features available to you.",
    tip: "This tutorial only shows once — you can always find help in the sidebar.",
    color: "text-primary",
  },
  {
    icon: CalendarDays,
    title: "Study Planner",
    description:
      "Create study tasks, set difficulty levels, and auto-generate smart schedules. Upload a syllabus PDF and AI will extract your subjects and topics automatically.",
    tip: 'Click "Auto Generate" to build a full week schedule in seconds.',
    color: "text-primary",
  },
  {
    icon: Timer,
    title: "Focus Timer",
    description:
      "A Pomodoro-style timer that alternates between 25-minute focus sessions and 5-minute breaks. Your completed sessions are tracked automatically.",
    tip: "Try to complete 4 sessions for a full Pomodoro cycle!",
    color: "text-accent",
  },
  {
    icon: Layers,
    title: "Flashcards",
    description:
      "Create flashcards manually or let AI generate them from any subject and topic. Cards are filtered to match your current study schedule.",
    tip: 'Use the "Scheduled" filter to see cards for your current topic.',
    color: "text-success",
  },
  {
    icon: HelpCircle,
    title: "AI Quiz",
    description:
      "Generate quizzes on any subject using AI. Pick a topic, choose the number of questions, and test your knowledge with instant explanations.",
    tip: "Quizzes are a great way to identify weak areas before exams.",
    color: "text-destructive",
  },
  {
    icon: MessageSquare,
    title: "AI Tutor (Nova)",
    description:
      "Chat with Nova, your AI study assistant. Upload PDFs or text files and ask questions about the content. Nova uses Socratic questioning to help you learn.",
    tip: "Attach a PDF and ask Nova to explain a specific chapter!",
    color: "text-primary",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description:
      "Track your study hours, completion rates, and progress over time with visual charts and insights.",
    tip: "Check analytics weekly to stay on top of your goals.",
    color: "text-accent",
  },
];

export function OnboardingTutorial() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      // Small delay so the dashboard renders first
      const t = setTimeout(() => setShow(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const finish = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setShow(false);
  };

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={finish}
          />

          {/* Card */}
          <motion.div
            className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Close */}
            <button
              onClick={finish}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Step indicator */}
            <div className="flex items-center gap-1.5 mb-6">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === step
                      ? "w-8 bg-primary"
                      : i < step
                      ? "w-4 bg-primary/40"
                      : "w-4 bg-border"
                  }`}
                />
              ))}
            </div>

            {/* Content - animated per step */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
              >
                <div
                  className={`w-14 h-14 rounded-xl bg-secondary flex items-center justify-center mb-4`}
                >
                  <Icon className={`w-7 h-7 ${current.color}`} />
                </div>

                <h3 className="font-display font-bold text-xl mb-2">
                  {current.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {current.description}
                </p>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-primary/80">{current.tip}</p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>

              <span className="text-xs text-muted-foreground">
                {step + 1} / {steps.length}
              </span>

              {isLast ? (
                <Button size="sm" onClick={finish} className="gap-1">
                  Get Started <Rocket className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setStep(step + 1)}
                  className="gap-1"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
