'use client';

import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Clock, CheckCircle2, Circle } from 'lucide-react';
import type { Task } from '@/types/task';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  onToggle?: (id: string) => void;
  onClick?: (task: Task) => void;
}

const TYPE_DOT: Record<string, string> = {
  일정: 'bg-[var(--accent-event)]',
  할일: 'bg-[var(--accent-todo)]',
};

export function TaskCard({ task, onToggle, onClick }: TaskCardProps) {
  const isDone = task.status === '완료' || task.status === '취소';
  const timeLabel = formatTimeRange(task.start, task.end);

  return (
    <button
      type="button"
      onClick={() => onClick?.(task)}
      className={cn(
        'group flex w-full items-start gap-3 rounded-2xl border border-transparent px-4 py-3.5 text-left transition-all',
        'hover:border-[var(--border)] hover:bg-[var(--surface)]',
        'active:scale-[0.98]',
        isDone && 'opacity-50',
      )}
    >
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onToggle?.(task.id);
        }}
        className="mt-0.5 shrink-0 cursor-pointer text-[var(--muted)] hover:text-[var(--accent-done)]"
      >
        {isDone ? (
          <CheckCircle2 size={22} className="text-[var(--accent-done)]" />
        ) : (
          <Circle size={22} />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TYPE_DOT[task.type])}
            aria-hidden
          />
          <h3
            className={cn(
              'min-w-0 break-words text-[15px] font-medium leading-snug',
              isDone && 'line-through',
            )}
          >
            {task.title}
          </h3>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
          {timeLabel && (
            <span className="inline-flex items-center gap-1">
              <Clock size={12} />
              {timeLabel}
            </span>
          )}
          {task.projects.slice(0, 2).map((p) => (
            <span
              key={p}
              className="rounded-md bg-[var(--surface-alt)] px-1.5 py-0.5 text-[11px] text-foreground/70"
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

function formatTimeRange(start: string | null, end: string | null) {
  if (!start) return null;
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  const sLabel = format(s, 'a h:mm', { locale: ko });
  if (!e) return sLabel;
  const sameDay = s.toDateString() === e.toDateString();
  if (sameDay) return `${sLabel} – ${format(e, 'h:mm', { locale: ko })}`;
  return `${sLabel} – ${format(e, 'M/d a h:mm', { locale: ko })}`;
}
