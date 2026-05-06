'use client';

import { create } from 'zustand';
import { PROJECT_OPTIONS, type Task, type TaskInput } from '@/types/task';

interface QuickAddState {
  open: boolean;
  defaultStart?: string | null;
  defaultEnd?: string | null;
}

interface TasksStore {
  tasks: Task[];
  projects: string[];
  selectedId: string | null;
  editingBlockId: string | null;
  hydrated: boolean;
  syncing: boolean;
  quickAddOpen: QuickAddState;

  hydrate: (tasks: Task[]) => void;
  setSyncing: (v: boolean) => void;

  selectTask: (id: string | null) => void;
  setEditingBlock: (id: string | null) => void;
  openQuickAdd: (defaults?: { start?: string | null; end?: string | null }) => void;
  closeQuickAdd: () => void;

  toggleDone: (id: string) => void;
  cancel: (id: string) => void;
  remove: (id: string) => void;
  update: (id: string, patch: Partial<Task>) => void;
  moveToTomorrow: (id: string) => void;
  shiftTime: (id: string, deltaMinutes: number) => void;
  resizeTime: (id: string, edge: 'start' | 'end', deltaMinutes: number) => void;
  add: (input: TaskInput) => string;

  addProject: (name: string) => void;
}

export const useTasksStore = create<TasksStore>((set, get) => ({
  tasks: [],
  projects: [...PROJECT_OPTIONS],
  selectedId: null,
  editingBlockId: null,
  hydrated: false,
  syncing: false,
  quickAddOpen: { open: false },

  hydrate: (tasks) => {
    const projects = new Set<string>(PROJECT_OPTIONS);
    for (const t of tasks) for (const p of t.projects) projects.add(p);
    set({ tasks, projects: [...projects], hydrated: true });
  },
  setSyncing: (v) => set({ syncing: v }),

  selectTask: (id) => set({ selectedId: id, editingBlockId: null }),
  setEditingBlock: (id) => set({ editingBlockId: id }),
  openQuickAdd: (defaults) =>
    set({
      editingBlockId: null,
      quickAddOpen: {
        open: true,
        defaultStart: defaults?.start ?? null,
        defaultEnd: defaults?.end ?? null,
      },
    }),
  closeQuickAdd: () => set({ quickAddOpen: { open: false } }),

  toggleDone: (id) => {
    let next: Task | null = null;
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id !== id) return t;
        const updated: Task = {
          ...t,
          status: t.status === '완료' ? '예정' : '완료',
        };
        next = updated;
        return updated;
      }),
    }));
    syncTask(next, ['status']);
  },

  cancel: (id) => {
    let next: Task | null = null;
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id !== id) return t;
        const updated: Task = { ...t, status: '취소' };
        next = updated;
        return updated;
      }),
      selectedId: null,
    }));
    syncTask(next, ['status']);
  },

  remove: (id) => {
    const target = get().tasks.find((t) => t.id === id);
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
    if (target?.notionId) {
      void fetch(`/api/tasks/${target.notionId}`, { method: 'DELETE' }).catch(
        () => {},
      );
    }
  },

  update: (id, patch) => {
    let next: Task | null = null;
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id !== id) return t;
        const updated: Task = { ...t, ...patch };
        next = updated;
        return updated;
      }),
    }));
    syncTask(next, Object.keys(patch) as Array<keyof Task>);
  },

  moveToTomorrow: (id) => {
    let next: Task | null = null;
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id !== id || !t.start) return t;
        const updated: Task = {
          ...t,
          start: shiftDay(t.start, 1),
          end: t.end ? shiftDay(t.end, 1) : null,
        };
        next = updated;
        return updated;
      }),
    }));
    syncTask(next, ['start', 'end']);
  },

  shiftTime: (id, deltaMinutes) => {
    let next: Task | null = null;
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id !== id || !t.start) return t;
        const updated: Task = {
          ...t,
          start: shiftMinutes(t.start, deltaMinutes),
          end: t.end ? shiftMinutes(t.end, deltaMinutes) : null,
        };
        next = updated;
        return updated;
      }),
    }));
    syncTask(next, ['start', 'end']);
  },

  resizeTime: (id, edge, deltaMinutes) => {
    let next: Task | null = null;
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id !== id || !t.start || !t.end) return t;
        if (edge === 'start') {
          const newStart = shiftMinutes(t.start, deltaMinutes);
          if (new Date(newStart) >= new Date(t.end)) return t;
          const updated: Task = { ...t, start: newStart };
          next = updated;
          return updated;
        }
        const newEnd = shiftMinutes(t.end, deltaMinutes);
        if (new Date(newEnd) <= new Date(t.start)) return t;
        const updated: Task = { ...t, end: newEnd };
        next = updated;
        return updated;
      }),
    }));
    syncTask(next, ['start', 'end']);
  },

  add: (input) => {
    const tempId = `temp-${Date.now()}`;
    const draft: Task = {
      id: tempId,
      title: input.title || '제목 없음',
      start: input.start ?? null,
      end: input.end ?? null,
      status: input.status ?? '예정',
      type: input.type ?? '할일',
      projects: input.projects ?? [],
      description: input.description ?? '',
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ tasks: [draft, ...s.tasks] }));

    void fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data: { task?: Task } = await res.json();
        if (!data.task) return;
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === tempId ? data.task! : t)),
        }));
      })
      .catch(() => {});

    return tempId;
  },

  addProject: (name) =>
    set((s) =>
      s.projects.includes(name) ? s : { projects: [...s.projects, name] },
    ),
}));

const SYNCABLE_KEYS = new Set<keyof Task>([
  'title',
  'start',
  'end',
  'status',
  'type',
  'projects',
  'description',
]);

function syncTask(task: Task | null, changedKeys: Array<keyof Task>) {
  if (!task?.notionId) return;
  const patch: Record<string, unknown> = {};
  for (const key of changedKeys) {
    if (!SYNCABLE_KEYS.has(key)) continue;
    patch[key] = task[key];
  }
  if (Object.keys(patch).length === 0) return;

  void fetch(`/api/tasks/${task.notionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  }).catch(() => {});
}

function shiftMinutes(iso: string, minutes: number) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

function shiftDay(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
