import { create } from "zustand";

// ============ NOTES ============
export interface Note {
  id: string;
  title: string;
  content: string;
  subject: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
}

// ============ HABITS ============
export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  targetPerDay: number;
  unit: string;
  completions: Record<string, number>; // date -> count
}

// ============ RESOURCES ============
export interface Resource {
  id: string;
  title: string;
  url: string;
  type: "link" | "video" | "pdf" | "article" | "other";
  subject: string;
  tags: string[];
  addedAt: string;
  notes: string;
}

// ============ STUDY GROUPS ============
export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  members: string[];
  goals: GroupGoal[];
  createdAt: string;
  color: string;
}

export interface GroupGoal {
  id: string;
  title: string;
  completed: boolean;
  assignee: string;
  dueDate?: string;
}

interface ExtrasStore {
  // Notes
  notes: Note[];
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  togglePinNote: (id: string) => void;

  // Habits
  habits: Habit[];
  addHabit: (habit: Habit) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  logHabit: (id: string, date: string, increment?: number) => void;

  // Resources
  resources: Resource[];
  addResource: (resource: Resource) => void;
  updateResource: (id: string, updates: Partial<Resource>) => void;
  deleteResource: (id: string) => void;

  // Study Groups
  groups: StudyGroup[];
  addGroup: (group: StudyGroup) => void;
  updateGroup: (id: string, updates: Partial<StudyGroup>) => void;
  deleteGroup: (id: string) => void;
  addGroupGoal: (groupId: string, goal: GroupGoal) => void;
  toggleGroupGoal: (groupId: string, goalId: string) => void;
}

export const useExtrasStore = create<ExtrasStore>((set) => ({
  // Notes
  notes: [],
  addNote: (note) => set((s) => ({ notes: [...s.notes, note] })),
  updateNote: (id, updates) => set((s) => ({
    notes: s.notes.map((n) => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n),
  })),
  deleteNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
  togglePinNote: (id) => set((s) => ({
    notes: s.notes.map((n) => n.id === id ? { ...n, pinned: !n.pinned } : n),
  })),

  // Habits
  habits: [],
  addHabit: (habit) => set((s) => ({ habits: [...s.habits, habit] })),
  updateHabit: (id, updates) => set((s) => ({
    habits: s.habits.map((h) => h.id === id ? { ...h, ...updates } : h),
  })),
  deleteHabit: (id) => set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),
  logHabit: (id, date, increment = 1) => set((s) => ({
    habits: s.habits.map((h) => {
      if (h.id !== id) return h;
      const current = h.completions[date] || 0;
      return { ...h, completions: { ...h.completions, [date]: current + increment } };
    }),
  })),

  // Resources
  resources: [],
  addResource: (resource) => set((s) => ({ resources: [...s.resources, resource] })),
  updateResource: (id, updates) => set((s) => ({
    resources: s.resources.map((r) => r.id === id ? { ...r, ...updates } : r),
  })),
  deleteResource: (id) => set((s) => ({ resources: s.resources.filter((r) => r.id !== id) })),

  // Study Groups
  groups: [],
  addGroup: (group) => set((s) => ({ groups: [...s.groups, group] })),
  updateGroup: (id, updates) => set((s) => ({
    groups: s.groups.map((g) => g.id === id ? { ...g, ...updates } : g),
  })),
  deleteGroup: (id) => set((s) => ({ groups: s.groups.filter((g) => g.id !== id) })),
  addGroupGoal: (groupId, goal) => set((s) => ({
    groups: s.groups.map((g) =>
      g.id === groupId ? { ...g, goals: [...g.goals, goal] } : g
    ),
  })),
  toggleGroupGoal: (groupId, goalId) => set((s) => ({
    groups: s.groups.map((g) =>
      g.id === groupId
        ? { ...g, goals: g.goals.map((gl) => gl.id === goalId ? { ...gl, completed: !gl.completed } : gl) }
        : g
    ),
  })),
}));
