import { create } from "zustand";
import type { Task } from "@/lib/types";

type TasksState = {
  tasks: Task[];
  toggleTask: (id: number) => void;
  addTask: (text: string) => void;
  removeTask: (id: number) => void;
};

const INITIAL_TASKS: Task[] = [
  { id: 1, text: "مصرف قرص گیاهی", done: false },
  { id: 2, text: "انجام تمرین کششی", done: true },
  { id: 3, text: "نوشیدن دمنوش بابونه", done: false },
  { id: 4, text: "جلسه آنلاین ساعت ۱۸:۰۰", done: false },
];

export const useTasksStore = create<TasksState>()((set) => ({
  tasks: INITIAL_TASKS,
  toggleTask: (id) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    })),
  addTask: (text) =>
    set((s) => ({ tasks: [...s.tasks, { id: Date.now(), text, done: false }] })),
  removeTask: (id) =>
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
}));
