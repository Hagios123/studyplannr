import { useGamificationStore, ACHIEVEMENTS, getLevelProgress, getLevel } from "@/stores/useGamificationStore";
import { Trophy, Star, Zap, Flame, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function XPPanel() {
  const { totalXP, getStreak, getAchievements, tasksCompleted, quizzesCompleted, flashcardsMastered, sessionsCompleted } = useGamificationStore();
  const level = getLevel(totalXP);
  const progress = getLevelProgress(totalXP);
  const streak = getStreak();
  const achievements = getAchievements();
  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
          <Trophy className="w-5 h-5 md:w-6 md:h-6 text-accent" /> XP & Achievements
        </h1>
        <p className="text-muted-foreground text-xs md:text-sm mt-1">
          Track your progress and unlock achievements
        </p>
      </div>

      {/* Level & XP Card */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <span className="text-2xl font-display font-bold text-primary">{level}</span>
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Level {level}</p>
            <p className="text-2xl font-display font-bold">{totalXP.toLocaleString()} XP</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-accent">
              <Flame className="w-5 h-5" />
              <span className="text-lg font-display font-bold">{streak}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">day streak</p>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Level {level}</span>
            <span>Level {level + 1}</span>
          </div>
          <Progress value={progress.percent} className="h-2" />
          <p className="text-[10px] text-muted-foreground text-center">
            {progress.current} / {progress.needed} XP to next level
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Target, label: "Tasks Done", value: tasksCompleted, color: "text-primary" },
          { icon: Zap, label: "Quizzes", value: quizzesCompleted, color: "text-accent" },
          { icon: Star, label: "Cards Mastered", value: flashcardsMastered, color: "text-success" },
          { icon: Flame, label: "Sessions", value: sessionsCompleted, color: "text-primary" },
        ].map((stat) => (
          <div key={stat.label} className="p-3 rounded-xl border border-border bg-card text-center">
            <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
            <p className="text-xl font-display font-bold">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Achievements */}
      <div className="space-y-3">
        <h2 className="font-display font-semibold text-lg flex items-center gap-2">
          <Star className="w-5 h-5 text-accent" />
          Achievements ({unlocked.length}/{achievements.length})
        </h2>

        {unlocked.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {unlocked.map((a) => (
              <div
                key={a.id}
                className="p-3 rounded-xl border border-accent/20 bg-accent/5 text-center transition-all hover:scale-[1.02]"
              >
                <span className="text-2xl">{a.icon}</span>
                <p className="text-xs font-semibold mt-1">{a.title}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{a.description}</p>
              </div>
            ))}
          </div>
        )}

        {locked.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground font-medium">Locked</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {locked.map((a) => (
                <div
                  key={a.id}
                  className="p-3 rounded-xl border border-border bg-secondary/30 text-center opacity-50"
                >
                  <span className="text-2xl grayscale">🔒</span>
                  <p className="text-xs font-semibold mt-1">{a.title}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{a.description}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
