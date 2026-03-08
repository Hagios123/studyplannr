import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface XPEvent {
  id: string;
  type: "task_complete" | "quiz_complete" | "flashcard_master" | "session_complete" | "streak_bonus" | "habit_complete";
  xp: number;
  description: string;
  timestamp: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpRequired?: number;
  condition: string;
  unlockedAt?: string;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: "first_session", title: "First Steps", description: "Complete your first study session", icon: "🎯", condition: "sessions >= 1" },
  { id: "streak_3", title: "On Fire", description: "Maintain a 3-day streak", icon: "🔥", condition: "streak >= 3" },
  { id: "streak_7", title: "Week Warrior", description: "Maintain a 7-day streak", icon: "⚡", condition: "streak >= 7" },
  { id: "streak_30", title: "Month Master", description: "Maintain a 30-day streak", icon: "👑", condition: "streak >= 30" },
  { id: "xp_100", title: "Centurion", description: "Earn 100 XP", icon: "💯", condition: "xp >= 100" },
  { id: "xp_500", title: "Scholar", description: "Earn 500 XP", icon: "📚", condition: "xp >= 500" },
  { id: "xp_1000", title: "Sage", description: "Earn 1,000 XP", icon: "🧙", condition: "xp >= 1000" },
  { id: "xp_5000", title: "Grandmaster", description: "Earn 5,000 XP", icon: "🏆", condition: "xp >= 5000" },
  { id: "flash_10", title: "Card Collector", description: "Master 10 flashcards", icon: "🃏", condition: "flashcards >= 10" },
  { id: "flash_50", title: "Memory Machine", description: "Master 50 flashcards", icon: "🧠", condition: "flashcards >= 50" },
  { id: "quiz_5", title: "Quiz Whiz", description: "Complete 5 quizzes", icon: "❓", condition: "quizzes >= 5" },
  { id: "tasks_25", title: "Task Titan", description: "Complete 25 tasks", icon: "✅", condition: "tasks >= 25" },
  { id: "level_5", title: "Rising Star", description: "Reach level 5", icon: "⭐", condition: "level >= 5" },
  { id: "level_10", title: "Veteran", description: "Reach level 10", icon: "🌟", condition: "level >= 10" },
];

const XP_VALUES = {
  task_complete: 15,
  quiz_complete: 25,
  flashcard_master: 5,
  session_complete: 20,
  streak_bonus: 10,
  habit_complete: 10,
};

function getLevel(xp: number): number {
  // Each level requires progressively more XP: level N needs N*100 XP total
  let level = 1;
  let threshold = 100;
  while (xp >= threshold) {
    level++;
    threshold += level * 100;
  }
  return level;
}

function getLevelProgress(xp: number): { current: number; needed: number; percent: number } {
  let level = 1;
  let prevThreshold = 0;
  let threshold = 100;
  while (xp >= threshold) {
    level++;
    prevThreshold = threshold;
    threshold += level * 100;
  }
  const current = xp - prevThreshold;
  const needed = threshold - prevThreshold;
  return { current, needed, percent: Math.round((current / needed) * 100) };
}

interface GamificationStore {
  totalXP: number;
  xpHistory: XPEvent[];
  unlockedAchievements: string[];
  streakDays: string[]; // dates with activity
  quizzesCompleted: number;
  tasksCompleted: number;
  flashcardsMastered: number;
  sessionsCompleted: number;

  addXP: (type: XPEvent["type"], description: string) => void;
  recordStreak: (date: string) => void;
  incrementStat: (stat: "quizzesCompleted" | "tasksCompleted" | "flashcardsMastered" | "sessionsCompleted") => void;
  getLevel: () => number;
  getLevelProgress: () => { current: number; needed: number; percent: number };
  getStreak: () => number;
  getAchievements: () => (Achievement & { unlocked: boolean })[];
  checkAchievements: () => string[]; // returns newly unlocked achievement ids
}

export const useGamificationStore = create<GamificationStore>()(
  persist(
    (set, get) => ({
      totalXP: 0,
      xpHistory: [],
      unlockedAchievements: [],
      streakDays: [],
      quizzesCompleted: 0,
      tasksCompleted: 0,
      flashcardsMastered: 0,
      sessionsCompleted: 0,

      addXP: (type, description) => {
        const xp = XP_VALUES[type];
        const event: XPEvent = {
          id: `xp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          type,
          xp,
          description,
          timestamp: new Date().toISOString(),
        };
        set((s) => ({
          totalXP: s.totalXP + xp,
          xpHistory: [event, ...s.xpHistory].slice(0, 200),
        }));
      },

      recordStreak: (date) => {
        set((s) => {
          if (s.streakDays.includes(date)) return s;
          return { streakDays: [...s.streakDays, date].slice(-365) };
        });
      },

      incrementStat: (stat) => {
        set((s) => ({ [stat]: (s[stat] as number) + 1 }));
      },

      getLevel: () => getLevel(get().totalXP),

      getLevelProgress: () => getLevelProgress(get().totalXP),

      getStreak: () => {
        const days = get().streakDays.sort();
        if (days.length === 0) return 0;
        let count = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const dateStr = d.toISOString().split("T")[0];
          if (days.includes(dateStr)) {
            count++;
          } else if (i > 0) {
            break;
          }
        }
        return count;
      },

      getAchievements: () => {
        const { totalXP, unlockedAchievements, flashcardsMastered, quizzesCompleted, tasksCompleted, sessionsCompleted } = get();
        const streak = get().getStreak();
        const level = getLevel(totalXP);

        return ACHIEVEMENTS.map((a) => ({
          ...a,
          unlocked: unlockedAchievements.includes(a.id),
        }));
      },

      checkAchievements: () => {
        const { totalXP, unlockedAchievements, flashcardsMastered, quizzesCompleted, tasksCompleted, sessionsCompleted } = get();
        const streak = get().getStreak();
        const level = getLevel(totalXP);
        const newlyUnlocked: string[] = [];

        const checks: Record<string, boolean> = {
          first_session: sessionsCompleted >= 1,
          streak_3: streak >= 3,
          streak_7: streak >= 7,
          streak_30: streak >= 30,
          xp_100: totalXP >= 100,
          xp_500: totalXP >= 500,
          xp_1000: totalXP >= 1000,
          xp_5000: totalXP >= 5000,
          flash_10: flashcardsMastered >= 10,
          flash_50: flashcardsMastered >= 50,
          quiz_5: quizzesCompleted >= 5,
          tasks_25: tasksCompleted >= 25,
          level_5: level >= 5,
          level_10: level >= 10,
        };

        for (const [id, met] of Object.entries(checks)) {
          if (met && !unlockedAchievements.includes(id)) {
            newlyUnlocked.push(id);
          }
        }

        if (newlyUnlocked.length > 0) {
          set((s) => ({
            unlockedAchievements: [...s.unlockedAchievements, ...newlyUnlocked],
          }));
        }

        return newlyUnlocked;
      },
    }),
    {
      name: "studyai-gamification",
    }
  )
);

export { ACHIEVEMENTS, XP_VALUES, getLevel, getLevelProgress };
