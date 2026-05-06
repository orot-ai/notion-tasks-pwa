'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  eachDayOfInterval,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useTasksStore } from '@/store/tasks';
import type { Task } from '@/types/task';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const SWIPE_THRESHOLD_PX = 80;
const SWIPE_VELOCITY = 500;

export default function MonthPage() {
  const tasks = useTasksStore((s) => s.tasks);
  const [anchor, setAnchor] = useState(() => startOfMonth(new Date()));
  const [direction, setDirection] = useState(0);

  const cells = useMemo(() => {
    const start = startOfWeek(startOfMonth(anchor));
    const end = endOfWeek(endOfMonth(anchor));
    return eachDayOfInterval({ start, end });
  }, [anchor]);

  const tasksByDate = useMemo(() => groupByDate(tasks), [tasks]);

  const move = (delta: number) => {
    setDirection(delta);
    setAnchor((d) => addMonths(d, delta));
  };

  return (
    <div className="mx-auto w-full max-w-2xl overflow-hidden">
      <header className="sticky top-0 z-30 bg-[var(--background)]/85 backdrop-blur-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {format(anchor, 'yyyy년 M월', { locale: ko })}
          </h1>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="이전 달"
              onClick={() => move(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-alt)]"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => {
                setDirection(0);
                setAnchor(startOfMonth(new Date()));
              }}
              className="rounded-full bg-[var(--surface-alt)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--border)]"
            >
              오늘
            </button>
            <button
              type="button"
              aria-label="다음 달"
              onClick={() => move(1)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-alt)]"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 px-2 pb-2">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={cn(
                'py-1.5 text-center text-[11px] font-bold uppercase tracking-wider',
                i === 0 && 'text-rose-500',
                i === 6 && 'text-blue-500',
                i !== 0 && i !== 6 && 'text-[var(--muted)]',
              )}
            >
              {w}
            </div>
          ))}
        </div>
      </header>

      <motion.div
        key={anchor.toISOString()}
        initial={
          direction !== 0
            ? { x: direction > 0 ? 320 : -320, opacity: 0 }
            : false
        }
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 360, damping: 32 }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        style={{ touchAction: 'pan-y' }}
        onDragEnd={(_, info) => {
          const offset = info.offset.x;
          const velocity = info.velocity.x;
          if (offset < -SWIPE_THRESHOLD_PX || velocity < -SWIPE_VELOCITY) {
            move(1);
          } else if (offset > SWIPE_THRESHOLD_PX || velocity > SWIPE_VELOCITY) {
            move(-1);
          }
        }}
        className="grid grid-cols-7 gap-px bg-[var(--border)] px-2"
      >
        {cells.map((day) => {
          const inMonth = isSameMonth(day, anchor);
          const isToday = isSameDay(day, new Date());
          const key = format(day, 'yyyy-MM-dd');
          const items = tasksByDate.get(key) ?? [];
          return (
            <Link
              key={day.toISOString()}
              href={`/timeline?d=${key}`}
              className={cn(
                'min-h-20 bg-[var(--background)] p-1.5 transition-colors hover:bg-[var(--surface-alt)]',
                !inMonth && 'opacity-35',
              )}
            >
              <div
                className={cn(
                  'mb-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-bold',
                  isToday && 'bg-rose-500 text-white',
                  !isToday && day.getDay() === 0 && 'text-rose-500',
                  !isToday && day.getDay() === 6 && 'text-blue-500',
                )}
              >
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {items.slice(0, 3).map((t) => {
                  const isDone = t.status === '완료' || t.status === '취소';
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        'truncate rounded-sm px-1 py-px text-[10px] font-medium leading-tight',
                        t.type === '일정'
                          ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                          : 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
                        isDone && 'opacity-50 line-through',
                      )}
                    >
                      {t.title}
                    </div>
                  );
                })}
                {items.length > 3 && (
                  <div className="px-1 text-[10px] text-[var(--muted)]">
                    +{items.length - 3}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </motion.div>
    </div>
  );
}

function groupByDate(tasks: Task[]) {
  const map = new Map<string, Task[]>();
  for (const t of tasks) {
    if (!t.start) continue;
    const key = format(new Date(t.start), 'yyyy-MM-dd');
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => new Date(a.start!).getTime() - new Date(b.start!).getTime());
  }
  return map;
}
