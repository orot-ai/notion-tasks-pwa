'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { addDays, format, isSameDay, startOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useTasksStore } from '@/store/tasks';
import { TimelineBlock } from '@/components/timeline-block';
import { assignLanes } from '@/lib/lanes';
import type { Task } from '@/types/task';
import { cn } from '@/lib/utils';

const HOUR_START = 6;
const HOUR_END = 24;
const HOUR_HEIGHT = 56;
const TOTAL_HEIGHT = (HOUR_END - HOUR_START) * HOUR_HEIGHT;
const SWIPE_THRESHOLD_PX = 80;
const SWIPE_VELOCITY = 500;

type DayCount = 1 | 2 | 3;

export default function TimelinePage() {
  const tasks = useTasksStore((s) => s.tasks);
  const openQuickAdd = useTasksStore((s) => s.openQuickAdd);
  const editingBlockId = useTasksStore((s) => s.editingBlockId);
  const setEditingBlock = useTasksStore((s) => s.setEditingBlock);

  const [days, setDays] = useState<DayCount>(1);
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [direction, setDirection] = useState(0);

  const dayList = useMemo(
    () => Array.from({ length: days }, (_, i) => addDays(anchor, i)),
    [anchor, days],
  );

  const move = (delta: number) => {
    setDirection(delta);
    setAnchor((d) => addDays(d, delta));
  };
  const goToday = () => {
    setDirection(0);
    setAnchor(startOfDay(new Date()));
  };

  const headerLabel = useMemo(() => {
    const last = dayList[dayList.length - 1];
    if (days === 1) return format(anchor, 'yyyy.M.d (E)', { locale: ko });
    return `${format(anchor, 'M.d')} – ${format(last, 'M.d')}`;
  }, [anchor, dayList, days]);

  return (
    <div className="mx-auto w-full max-w-3xl overflow-hidden">
      <header className="sticky top-0 z-30 bg-[var(--background)]/85 backdrop-blur-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="이전"
              onClick={() => move(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-alt)]"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-base sm:text-lg font-bold tracking-tight">
              {headerLabel}
            </h1>
            <button
              type="button"
              aria-label="다음"
              onClick={() => move(1)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-alt)]"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <button
            type="button"
            onClick={goToday}
            className="rounded-full bg-[var(--surface-alt)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--border)]"
          >
            오늘
          </button>
        </div>

        <div className="flex justify-center gap-1.5 px-5 pb-3">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setDays(n as DayCount)}
              className={cn(
                'rounded-full px-3.5 py-1 text-xs font-semibold transition-all',
                days === n
                  ? 'bg-foreground text-[var(--background)]'
                  : 'bg-[var(--surface-alt)] text-[var(--muted)]',
              )}
            >
              {n}일
            </button>
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
      >
        <div className="grid grid-cols-[40px_1fr] border-b border-[var(--border)]">
          <div />
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${days}, 1fr)` }}
          >
            {dayList.map((d) => {
              const today = isSameDay(d, new Date());
              return (
                <div
                  key={d.toISOString()}
                  className="px-2 py-2 text-center text-xs font-medium border-l border-[var(--border)] first:border-l-0"
                >
                  <div className="text-[10px] text-[var(--muted)]">
                    {format(d, 'E', { locale: ko })}
                  </div>
                  <div
                    className={cn(
                      'mt-0.5 inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-sm font-bold',
                      today ? 'bg-rose-500 text-white' : 'text-foreground',
                    )}
                  >
                    {format(d, 'd')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-[40px_1fr]">
          <HourLabels />
          <div
            className="relative grid"
            style={{
              gridTemplateColumns: `repeat(${days}, 1fr)`,
              height: TOTAL_HEIGHT,
            }}
          >
            {dayList.map((day) => (
              <DayColumn
                key={day.toISOString()}
                day={day}
                tasks={tasks}
                editingBlockId={editingBlockId}
                onEmptyTap={(hour, minute) => {
                  if (editingBlockId) {
                    setEditingBlock(null);
                    return;
                  }
                  const start = new Date(day);
                  start.setHours(hour, minute, 0, 0);
                  const end = new Date(start.getTime() + 60 * 60 * 1000);
                  openQuickAdd({
                    start: start.toISOString(),
                    end: end.toISOString(),
                  });
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>

      <button
        type="button"
        onClick={() => openQuickAdd()}
        aria-label="새 태스크"
        className="fixed right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-fg)] shadow-xl shadow-indigo-500/30 active:scale-95 transition-transform"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 88px)' }}
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>
    </div>
  );
}

function HourLabels() {
  return (
    <div className="relative" style={{ height: TOTAL_HEIGHT }}>
      {Array.from(
        { length: HOUR_END - HOUR_START },
        (_, i) => HOUR_START + i,
      ).map((h) => (
        <div
          key={h}
          className="absolute right-1.5 -translate-y-1.5 text-[10px] font-medium text-[var(--muted)]"
          style={{ top: (h - HOUR_START) * HOUR_HEIGHT }}
        >
          {h}
        </div>
      ))}
    </div>
  );
}

function DayColumn({
  day,
  tasks,
  editingBlockId,
  onEmptyTap,
}: {
  day: Date;
  tasks: Task[];
  editingBlockId: string | null;
  onEmptyTap: (hour: number, minute: number) => void;
}) {
  const dayTasks = useMemo(
    () => tasks.filter((t) => t.start && isSameDay(new Date(t.start), day)),
    [day, tasks],
  );

  const lanes = useMemo(() => assignLanes(dayTasks), [dayTasks]);
  const isToday = isSameDay(day, new Date());
  const nowOffset = isToday ? minutesSinceStart(new Date()) : null;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (editingBlockId) {
      onEmptyTap(0, 0);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutes = Math.round((y / HOUR_HEIGHT) * 60 / 30) * 30;
    const totalMin = HOUR_START * 60 + minutes;
    const hour = Math.floor(totalMin / 60);
    const minute = totalMin % 60;
    onEmptyTap(hour, minute);
  };

  return (
    <div
      onClick={handleClick}
      className="relative border-l border-[var(--border)] first:border-l-0 cursor-pointer"
    >
      {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => i).map((i) => (
        <div
          key={i}
          className="border-t border-[var(--border)]/60 pointer-events-none"
          style={{ height: HOUR_HEIGHT }}
        />
      ))}

      {dayTasks.map((t) => {
        const lane = lanes.get(t.id);
        if (!lane) return null;
        return (
          <TimelineBlock
            key={t.id}
            task={t}
            hourHeight={HOUR_HEIGHT}
            hourStart={HOUR_START}
            laneInfo={lane}
          />
        );
      })}

      {nowOffset !== null && nowOffset > 0 && nowOffset < TOTAL_HEIGHT && (
        <div
          className="pointer-events-none absolute left-0 right-0 z-20"
          style={{ top: nowOffset }}
        >
          <div className="relative flex items-center">
            <span className="absolute -left-1 h-2.5 w-2.5 rounded-full bg-rose-500" />
            <span className="h-px w-full bg-rose-500" />
          </div>
        </div>
      )}
    </div>
  );
}

function minutesSinceStart(d: Date) {
  const minutes = (d.getHours() - HOUR_START) * 60 + d.getMinutes();
  return (minutes / 60) * HOUR_HEIGHT;
}
