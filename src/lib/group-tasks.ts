import { isToday, isThisWeek, startOfDay } from 'date-fns';
import type { Task } from '@/types/task';

export type Group =
  | 'overdue'
  | 'today'
  | 'thisWeek'
  | 'upcoming'
  | 'undated'
  | 'done';

export const GROUP_LABELS: Record<Group, string> = {
  overdue: '지각',
  today: '오늘',
  thisWeek: '이번주',
  upcoming: '예정',
  undated: '날짜 없음',
  done: '완료',
};

export const GROUP_COLORS: Record<Group, string> = {
  overdue: 'bg-rose-500',
  today: 'bg-amber-500',
  thisWeek: 'bg-blue-500',
  upcoming: 'bg-zinc-400',
  undated: 'bg-zinc-300',
  done: 'bg-emerald-500',
};

export const GROUP_ORDER: Group[] = [
  'overdue',
  'today',
  'thisWeek',
  'upcoming',
  'undated',
  'done',
];

export function groupTask(task: Task): Group {
  if (task.status === '완료' || task.status === '취소') return 'done';
  if (!task.start) return 'undated';

  const start = new Date(task.start);
  const todayStart = startOfDay(new Date());

  if (isToday(start)) return 'today';
  if (start < todayStart) return 'overdue';
  if (isThisWeek(start, { weekStartsOn: 1 })) return 'thisWeek';
  return 'upcoming';
}

export function groupTasks(tasks: Task[]): Record<Group, Task[]> {
  const result: Record<Group, Task[]> = {
    overdue: [],
    today: [],
    thisWeek: [],
    upcoming: [],
    undated: [],
    done: [],
  };
  for (const t of tasks) result[groupTask(t)].push(t);

  for (const g of GROUP_ORDER) {
    result[g].sort((a, b) => {
      const aT = a.start ? new Date(a.start).getTime() : Infinity;
      const bT = b.start ? new Date(b.start).getTime() : Infinity;
      return aT - bT;
    });
  }
  return result;
}
