'use client';

import { useEffect } from 'react';
import { useTasksStore } from '@/store/tasks';
import type { Task } from '@/types/task';

let inFlight = false;

export function TasksHydrator() {
  useEffect(() => {
    void refreshTasks();
    const onFocus = () => void refreshTasks();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);
  return null;
}

export async function refreshTasks() {
  if (inFlight) return;
  inFlight = true;
  const { hydrate, setSyncing } = useTasksStore.getState();
  setSyncing(true);
  try {
    const res = await fetch('/api/tasks', { cache: 'no-store' });
    if (!res.ok) throw new Error('fetch failed');
    const data = (await res.json()) as { tasks?: Task[] };
    if (Array.isArray(data.tasks)) hydrate(data.tasks);
  } catch (err) {
    console.error('[refreshTasks]', err);
  } finally {
    setSyncing(false);
    inFlight = false;
  }
}
