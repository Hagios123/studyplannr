import { create } from "zustand";

export type Difficulty = "easy" | "moderate" | "hard";

export interface SubjectConfig {
  name: string;
  difficulty: Difficulty;
  topics: string[];
}

export interface FreeTimeSlot {
  day: string; // e.g. "Monday"
  startTime: string; // "18:00"
  endTime: string; // "21:00"
}

export interface StudyTask {
  id: string;
  subject: string;
  topic: string;
  date: string;
  timeSlot: string;
  duration: number; // minutes
  status: "pending" | "completed" | "skipped";
  priority: "low" | "medium" | "high";
}

export interface Flashcard {
  id: string;
  subject: string;
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

// Duration in minutes based on difficulty
const DIFFICULTY_DURATION: Record<Difficulty, number> = {
  easy: 20,
  moderate: 40,
  hard: 60,
};

const DIFFICULTY_PRIORITY: Record<Difficulty, StudyTask["priority"]> = {
  easy: "low",
  moderate: "medium",
  hard: "high",
};

interface StudyStore {
  tasks: StudyTask[];
  flashcards: Flashcard[];
  quizQuestions: QuizQuestion[];
  sessions: StudySession[];
  subjects: string[];
  subjectConfigs: SubjectConfig[];
  freeTimeSlots: FreeTimeSlot[];

  addTask: (task: StudyTask) => void;
  updateTask: (id: string, updates: Partial<StudyTask>) => void;
  deleteTask: (id: string) => void;
  updateTaskStatus: (id: string, status: StudyTask["status"]) => void;
  addSession: (session: StudySession) => void;
  toggleFlashcardMastered: (id: string) => void;

  updateSubjectConfig: (name: string, config: Partial<SubjectConfig>) => void;
  addSubjectConfig: (config: SubjectConfig) => void;
  removeSubjectConfig: (name: string) => void;
  setFreeTimeSlots: (slots: FreeTimeSlot[]) => void;
  addFreeTimeSlot: (slot: FreeTimeSlot) => void;
  removeFreeTimeSlot: (day: string) => void;

  autoGenerateTasks: (startDate: string, days: number) => void;
}

const defaultSubjectConfigs: SubjectConfig[] = [
  { name: "Mathematics", difficulty: "hard", topics: ["Linear Algebra - Eigenvalues", "Calculus - Integration by Parts", "Calculus - Differential Equations", "Probability - Bayes' Theorem"] },
  { name: "Physics", difficulty: "moderate", topics: ["Quantum Mechanics - Wave Functions", "Thermodynamics - Entropy", "Electromagnetism - Maxwell's Equations", "Optics - Diffraction"] },
  { name: "Computer Science", difficulty: "moderate", topics: ["Data Structures - B-Trees", "Algorithms - Dynamic Programming", "Algorithms - Graph Theory", "OS - Memory Management"] },
];

const defaultFreeTimeSlots: FreeTimeSlot[] = [
  { day: "Monday", startTime: "18:00", endTime: "21:00" },
  { day: "Tuesday", startTime: "18:00", endTime: "21:00" },
  { day: "Wednesday", startTime: "18:00", endTime: "21:00" },
  { day: "Thursday", startTime: "18:00", endTime: "21:00" },
  { day: "Friday", startTime: "18:00", endTime: "21:00" },
  { day: "Saturday", startTime: "10:00", endTime: "14:00" },
  { day: "Sunday", startTime: "10:00", endTime: "14:00" },
];

const mockFlashcards: Flashcard[] = [
  { id: "f1", subject: "Mathematics", front: "What is an eigenvalue?", back: "A scalar λ such that Av = λv for a nonzero vector v and matrix A.", mastered: false },
  { id: "f2", subject: "Physics", front: "What is the Schrödinger equation?", back: "iℏ ∂/∂t |Ψ⟩ = Ĥ |Ψ⟩ — describes how the quantum state of a system changes over time.", mastered: false },
  { id: "f3", subject: "Computer Science", front: "What is the time complexity of searching a B-tree?", back: "O(log n) — balanced tree structure ensures logarithmic search time.", mastered: true },
  { id: "f4", subject: "Mathematics", front: "What is integration by parts formula?", back: "∫u dv = uv − ∫v du", mastered: false },
];

const mockQuiz: QuizQuestion[] = [
  { id: "q1", subject: "Mathematics", question: "Which of the following is true about eigenvalues of a symmetric matrix?", options: ["They are always complex", "They are always real", "They are always zero", "They don't exist"], correctIndex: 1 },
  { id: "q2", subject: "Physics", question: "What does the wave function Ψ represent?", options: ["The exact position of a particle", "The probability amplitude", "The particle's velocity", "The energy level"], correctIndex: 1 },
  { id: "q3", subject: "Computer Science", question: "What is the main advantage of a B-tree over a binary search tree?", options: ["Simpler implementation", "Better cache performance and fewer disk reads", "Always faster insertions", "Uses less memory"], correctIndex: 1 },
];

const mockSessions: StudySession[] = [
  { id: "s1", date: "2026-02-20", subject: "Mathematics", duration: 45, type: "pomodoro" },
  { id: "s2", date: "2026-02-20", subject: "Physics", duration: 60, type: "regular" },
  { id: "s3", date: "2026-02-21", subject: "Computer Science", duration: 50, type: "pomodoro" },
  { id: "s4", date: "2026-02-22", subject: "Mathematics", duration: 45, type: "pomodoro" },
  { id: "s5", date: "2026-02-22", subject: "Physics", duration: 30, type: "pomodoro" },
  { id: "s6", date: "2026-02-23", subject: "Computer Science", duration: 60, type: "regular" },
  { id: "s7", date: "2026-02-23", subject: "Mathematics", duration: 45, type: "pomodoro" },
  { id: "s8", date: "2026-02-24", subject: "Physics", duration: 55, type: "pomodoro" },
  { id: "s9", date: "2026-02-24", subject: "Computer Science", duration: 40, type: "pomodoro" },
  { id: "s10", date: "2026-02-24", subject: "Mathematics", duration: 50, type: "regular" },
];

// Helper: get day name from date string
function getDayName(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

// Helper: add minutes to a time string "HH:MM"
function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const totalMins = h * 60 + m + minutes;
  const newH = Math.floor(totalMins / 60) % 24;
  const newM = totalMins % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

// Helper: available minutes from a free time slot
function slotMinutes(slot: FreeTimeSlot): number {
  const [sh, sm] = slot.startTime.split(":").map(Number);
  const [eh, em] = slot.endTime.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

export const useStudyStore = create<StudyStore>((set, get) => ({
  tasks: [],
  flashcards: mockFlashcards,
  quizQuestions: mockQuiz,
  sessions: mockSessions,
  subjects: ["Mathematics", "Physics", "Computer Science"],
  subjectConfigs: defaultSubjectConfigs,
  freeTimeSlots: defaultFreeTimeSlots,

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

  updateSubjectConfig: (name, config) =>
    set((state) => ({
      subjectConfigs: state.subjectConfigs.map((s) =>
        s.name === name ? { ...s, ...config } : s
      ),
    })),

  addSubjectConfig: (config) =>
    set((state) => ({
      subjectConfigs: [...state.subjectConfigs, config],
      subjects: [...state.subjects, config.name],
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

  autoGenerateTasks: (startDate: string, days: number) => {
    const { subjectConfigs, freeTimeSlots } = get();
    const newTasks: StudyTask[] = [];

    // Build a round-robin queue of all topics with their subject config
    const topicQueue: { subject: string; topic: string; difficulty: Difficulty }[] = [];
    // Interleave subjects so schedule is varied
    const maxTopics = Math.max(...subjectConfigs.map((s) => s.topics.length));
    for (let i = 0; i < maxTopics; i++) {
      for (const sc of subjectConfigs) {
        if (i < sc.topics.length) {
          topicQueue.push({ subject: sc.name, topic: sc.topics[i], difficulty: sc.difficulty });
        }
      }
    }

    let topicIndex = 0;

    for (let d = 0; d < days; d++) {
      const date = new Date(startDate + "T12:00:00");
      date.setDate(date.getDate() + d);
      const dateStr = date.toISOString().split("T")[0];
      const dayName = getDayName(dateStr);

      const slot = freeTimeSlots.find((s) => s.day === dayName);
      if (!slot) continue;

      let currentTime = slot.startTime;
      const availableMinutes = slotMinutes(slot);
      let usedMinutes = 0;
      const GAP = 5; // 5 min gap between tasks

      while (topicIndex < topicQueue.length) {
        const item = topicQueue[topicIndex];
        const duration = DIFFICULTY_DURATION[item.difficulty];

        if (usedMinutes + duration > availableMinutes) break;

        newTasks.push({
          id: `auto-${Date.now()}-${topicIndex}-${d}`,
          subject: item.subject,
          topic: item.topic,
          date: dateStr,
          timeSlot: currentTime,
          duration,
          status: "pending",
          priority: DIFFICULTY_PRIORITY[item.difficulty],
        });

        currentTime = addMinutesToTime(currentTime, duration + GAP);
        usedMinutes += duration + GAP;
        topicIndex++;
      }
    }

    set((state) => ({ tasks: [...state.tasks, ...newTasks] }));
  },
}));
