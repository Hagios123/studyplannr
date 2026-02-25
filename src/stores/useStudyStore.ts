import { create } from "zustand";

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

interface StudyStore {
  tasks: StudyTask[];
  flashcards: Flashcard[];
  quizQuestions: QuizQuestion[];
  sessions: StudySession[];
  subjects: string[];
  addTask: (task: StudyTask) => void;
  updateTaskStatus: (id: string, status: StudyTask["status"]) => void;
  addSession: (session: StudySession) => void;
  toggleFlashcardMastered: (id: string) => void;
}

const mockTasks: StudyTask[] = [
  { id: "1", subject: "Mathematics", topic: "Linear Algebra - Eigenvalues", date: "2026-02-25", timeSlot: "18:00", duration: 45, status: "pending", priority: "high" },
  { id: "2", subject: "Physics", topic: "Quantum Mechanics - Wave Functions", date: "2026-02-25", timeSlot: "19:00", duration: 60, status: "pending", priority: "medium" },
  { id: "3", subject: "Computer Science", topic: "Data Structures - B-Trees", date: "2026-02-25", timeSlot: "20:15", duration: 45, status: "completed", priority: "high" },
  { id: "4", subject: "Mathematics", topic: "Calculus - Integration by Parts", date: "2026-02-26", timeSlot: "18:00", duration: 50, status: "pending", priority: "medium" },
  { id: "5", subject: "Physics", topic: "Thermodynamics - Entropy", date: "2026-02-26", timeSlot: "19:00", duration: 45, status: "pending", priority: "low" },
  { id: "6", subject: "Computer Science", topic: "Algorithms - Dynamic Programming", date: "2026-02-27", timeSlot: "18:00", duration: 60, status: "pending", priority: "high" },
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

export const useStudyStore = create<StudyStore>((set) => ({
  tasks: mockTasks,
  flashcards: mockFlashcards,
  quizQuestions: mockQuiz,
  sessions: mockSessions,
  subjects: ["Mathematics", "Physics", "Computer Science"],
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
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
}));
