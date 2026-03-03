import { create } from "zustand";

export type Difficulty = "very-easy" | "easy" | "moderate" | "hard" | "very-hard" | "custom";

export interface SubjectConfig {
  name: string;
  difficulty: Difficulty;
  customDuration?: number;
  topics: string[];
}

export interface FreeTimeSlot {
  day: string;
  startTime: string;
  endTime: string;
  maxHours?: number; // max study hours for this day
}

export interface StudyTask {
  id: string;
  subject: string;
  topic: string;
  date: string;
  timeSlot: string;
  duration: number;
  status: "pending" | "completed" | "skipped";
  priority: "low" | "medium" | "high";
  recurrence?: TaskRecurrence;
}

export interface TaskRecurrence {
  type: "daily" | "weekly" | "custom";
  interval?: number; // e.g. every N days
  endDate?: string;
}

export interface Flashcard {
  id: string;
  subject: string;
  topic?: string;
  front: string;
  back: string;
  mastered: boolean;
}

export interface QuizQuestion {
  id: string;
  subject: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export interface StudySession {
  id: string;
  date: string;
  subject: string;
  duration: number;
  type: "pomodoro" | "regular";
}

const DIFFICULTY_DURATION: Record<Exclude<Difficulty, "custom">, number> = {
  "very-easy": 15,
  easy: 25,
  moderate: 40,
  hard: 55,
  "very-hard": 75,
};

const DIFFICULTY_PRIORITY: Record<Exclude<Difficulty, "custom">, StudyTask["priority"]> = {
  "very-easy": "low",
  easy: "low",
  moderate: "medium",
  hard: "high",
  "very-hard": "high",
};

export function getDurationForDifficulty(difficulty: Difficulty, customDuration?: number): number {
  if (difficulty === "custom" && customDuration) return customDuration;
  if (difficulty === "custom") return 30;
  return DIFFICULTY_DURATION[difficulty];
}

export function getPriorityForDifficulty(difficulty: Difficulty): StudyTask["priority"] {
  if (difficulty === "custom") return "medium";
  return DIFFICULTY_PRIORITY[difficulty];
}

function getDayName(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const totalMins = h * 60 + m + minutes;
  const newH = Math.floor(totalMins / 60) % 24;
  const newM = totalMins % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

function slotMinutes(slot: FreeTimeSlot): number {
  const [sh, sm] = slot.startTime.split(":").map(Number);
  const [eh, em] = slot.endTime.split(":").map(Number);
  const total = (eh * 60 + em) - (sh * 60 + sm);
  if (slot.maxHours) return Math.min(total, slot.maxHours * 60);
  return total;
}

interface StudyStore {
  tasks: StudyTask[];
  flashcards: Flashcard[];
  quizQuestions: QuizQuestion[];
  sessions: StudySession[];
  subjects: string[];
  subjectConfigs: SubjectConfig[];
  freeTimeSlots: FreeTimeSlot[];
  globalMaxHours: number | null;

  addTask: (task: StudyTask) => void;
  updateTask: (id: string, updates: Partial<StudyTask>) => void;
  deleteTask: (id: string) => void;
  updateTaskStatus: (id: string, status: StudyTask["status"]) => void;
  addSession: (session: StudySession) => void;
  toggleFlashcardMastered: (id: string) => void;
  addFlashcard: (card: Flashcard) => void;

  updateSubjectConfig: (name: string, config: Partial<SubjectConfig>) => void;
  addSubjectConfig: (config: SubjectConfig) => void;
  removeSubjectConfig: (name: string) => void;
  setFreeTimeSlots: (slots: FreeTimeSlot[]) => void;
  addFreeTimeSlot: (slot: FreeTimeSlot) => void;
  removeFreeTimeSlot: (day: string) => void;
  setGlobalMaxHours: (hours: number | null) => void;

  addCustomSubject: (name: string) => void;

  autoGenerateTasks: (startDate: string, days: number, customConfigs?: SubjectConfig[]) => void;
  generateRecurringTasks: (task: StudyTask) => void;
}

const defaultFreeTimeSlots: FreeTimeSlot[] = [
  { day: "Monday", startTime: "18:00", endTime: "21:00" },
  { day: "Tuesday", startTime: "18:00", endTime: "21:00" },
  { day: "Wednesday", startTime: "18:00", endTime: "21:00" },
  { day: "Thursday", startTime: "18:00", endTime: "21:00" },
  { day: "Friday", startTime: "18:00", endTime: "21:00" },
  { day: "Saturday", startTime: "10:00", endTime: "14:00" },
  { day: "Sunday", startTime: "10:00", endTime: "14:00" },
];

const mockFlashcards: Flashcard[] = [];

const mockQuiz: QuizQuestion[] = [];

const mockSessions: StudySession[] = [];

export const useStudyStore = create<StudyStore>((set, get) => ({
  tasks: [],
  flashcards: mockFlashcards,
  quizQuestions: mockQuiz,
  sessions: mockSessions,
  subjects: [],
  subjectConfigs: [],
  freeTimeSlots: defaultFreeTimeSlots,
  globalMaxHours: null,

  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),

  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  deleteTask: (id) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),

  updateTaskStatus: (id, status) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
    })),

  addSession: (session) => set((state) => ({ sessions: [...state.sessions, session] })),

  toggleFlashcardMastered: (id) =>
    set((state) => ({
      flashcards: state.flashcards.map((f) =>
        f.id === id ? { ...f, mastered: !f.mastered } : f
      ),
    })),

  addFlashcard: (card) => set((state) => ({ flashcards: [...state.flashcards, card] })),

  updateSubjectConfig: (name, config) =>
    set((state) => ({
      subjectConfigs: state.subjectConfigs.map((s) =>
        s.name === name ? { ...s, ...config } : s
      ),
    })),

  addSubjectConfig: (config) =>
    set((state) => ({
      subjectConfigs: [...state.subjectConfigs, config],
      subjects: state.subjects.includes(config.name) ? state.subjects : [...state.subjects, config.name],
    })),

  removeSubjectConfig: (name) =>
    set((state) => ({
      subjectConfigs: state.subjectConfigs.filter((s) => s.name !== name),
      subjects: state.subjects.filter((s) => s !== name),
    })),

  setFreeTimeSlots: (slots) => set({ freeTimeSlots: slots }),

  addFreeTimeSlot: (slot) =>
    set((state) => ({
      freeTimeSlots: [...state.freeTimeSlots.filter((s) => s.day !== slot.day), slot],
    })),

  removeFreeTimeSlot: (day) =>
    set((state) => ({
      freeTimeSlots: state.freeTimeSlots.filter((s) => s.day !== day),
    })),

  setGlobalMaxHours: (hours) => set({ globalMaxHours: hours }),

  addCustomSubject: (name) =>
    set((state) => {
      if (state.subjects.includes(name)) return state;
      return { subjects: [...state.subjects, name] };
    }),

  autoGenerateTasks: (startDate: string, days: number, customConfigs?: SubjectConfig[]) => {
    const { subjectConfigs, freeTimeSlots, globalMaxHours } = get();
    const configs = customConfigs || subjectConfigs;
    const newTasks: StudyTask[] = [];

    const newSubjects = configs.map(c => c.name);

    const topicQueue: { subject: string; topic: string; difficulty: Difficulty; customDuration?: number }[] = [];
    const maxTopics = Math.max(...configs.map((s) => s.topics.length));
    for (let i = 0; i < maxTopics; i++) {
      for (const sc of configs) {
        if (i < sc.topics.length) {
          topicQueue.push({ subject: sc.name, topic: sc.topics[i], difficulty: sc.difficulty, customDuration: sc.customDuration });
        }
      }
    }

    if (topicQueue.length === 0) return;

    let topicIndex = 0;

    for (let d = 0; d < days; d++) {
      const date = new Date(startDate + "T12:00:00");
      date.setDate(date.getDate() + d);
      const dateStr = date.toISOString().split("T")[0];
      const dayName = getDayName(dateStr);

      const slot = freeTimeSlots.find((s) => s.day === dayName);
      if (!slot) continue;

      let currentTime = slot.startTime;
      let availableMinutes = slotMinutes(slot);
      if (globalMaxHours) availableMinutes = Math.min(availableMinutes, globalMaxHours * 60);
      let usedMinutes = 0;
      const GAP = 5;

      while (usedMinutes < availableMinutes) {
        const item = topicQueue[topicIndex % topicQueue.length];
        const duration = getDurationForDifficulty(item.difficulty, item.customDuration);

        if (usedMinutes + duration > availableMinutes) break;

        newTasks.push({
          id: `auto-${Date.now()}-${topicIndex}-${d}`,
          subject: item.subject,
          topic: item.topic,
          date: dateStr,
          timeSlot: currentTime,
          duration,
          status: "pending",
          priority: getPriorityForDifficulty(item.difficulty),
        });

        currentTime = addMinutesToTime(currentTime, duration + GAP);
        usedMinutes += duration + GAP;
        topicIndex++;
      }
    }

    set((state) => ({
      tasks: [...state.tasks, ...newTasks],
      subjects: [...new Set([...state.subjects, ...newSubjects])],
      subjectConfigs: [
        ...state.subjectConfigs.filter(sc => !configs.find(c => c.name === sc.name)),
        ...configs,
      ],
    }));
  },

  generateRecurringTasks: (task: StudyTask) => {
    if (!task.recurrence) return;
    const { recurrence } = task;
    const newTasks: StudyTask[] = [];
    const startDate = new Date(task.date + "T12:00:00");
    const endDate = recurrence.endDate ? new Date(recurrence.endDate + "T12:00:00") : new Date(startDate);
    if (!recurrence.endDate) endDate.setDate(endDate.getDate() + 30); // default 30 days

    const interval = recurrence.type === "daily" ? 1 : recurrence.type === "weekly" ? 7 : (recurrence.interval || 1);

    let current = new Date(startDate);
    current.setDate(current.getDate() + interval); // skip original

    while (current <= endDate) {
      const dateStr = current.toISOString().split("T")[0];
      newTasks.push({
        ...task,
        id: `rec-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        date: dateStr,
        status: "pending",
      });
      current.setDate(current.getDate() + interval);
    }

    set((state) => ({ tasks: [...state.tasks, ...newTasks] }));
  },
}));
