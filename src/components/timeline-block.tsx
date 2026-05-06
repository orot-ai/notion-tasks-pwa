'use client';

import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Clock, X } from 'lucide-react';
import type { Task } from '@/types/task';
import { useTasksStore } from '@/store/tasks';
import { cn } from '@/lib/utils';
import type { LaneInfo } from '@/lib/lanes';

interface Props {
  task: Task;
  hourHeight: number;
  hourStart: number;
  laneInfo: LaneInfo;
}

const SNAP_MINUTES = 15;
const MINUTES_PER_DAY = 1440;
const TAP_THRESHOLD_PX = 5;
const LONG_PRESS_MS = 350;

type DragKind = 'move' | 'resize-top' | 'resize-bot';

interface DragState {
  kind: DragKind;
  startX: number;
  startY: number;
  deltaMin: number;
  deltaDays: number;
}

export function TimelineBlock({
  task,
  hourHeight,
  hourStart,
  laneInfo,
}: Props) {
  const selectTask = useTasksStore((s) => s.selectTask);
  const shiftTime = useTasksStore((s) => s.shiftTime);
  const resizeTime = useTasksStore((s) => s.resizeTime);
  const editingBlockId = useTasksStore((s) => s.editingBlockId);
  const setEditingBlock = useTasksStore((s) => s.setEditingBlock);
  const editing = editingBlockId === task.id;

  const [drag, setDrag] = useState<DragState | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  const columnWidthRef = useRef(0);
  const movedRef = useRef(false);
  const suppressClickUntilRef = useRef(0);

  const startDate = task.start ? new Date(task.start) : null;
  const endDate = task.end
    ? new Date(task.end)
    : startDate
      ? new Date(startDate.getTime() + 60 * 60 * 1000)
      : null;

  const measureColumnWidth = () => {
    const parent = ref.current?.parentElement;
    columnWidthRef.current = parent?.getBoundingClientRect().width ?? 0;
  };

  const beginDrag = (
    target: Element,
    pointerId: number,
    kind: DragKind,
    startX: number,
    startY: number,
  ) => {
    try {
      (target as HTMLElement).setPointerCapture(pointerId);
    } catch {
      /* ignore */
    }
    measureColumnWidth();
    movedRef.current = false;
    setDrag({ kind, startX, startY, deltaMin: 0, deltaDays: 0 });
  };

  const handleBodyPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (editing) {
      e.preventDefault();
      beginDrag(e.currentTarget, e.pointerId, 'move', e.clientX, e.clientY);
      return;
    }

    const startX = e.clientX;
    const startY = e.clientY;
    const pointerId = e.pointerId;
    const target = e.currentTarget;
    let canceled = false;

    const cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };

    const timer = window.setTimeout(() => {
      if (canceled) return;
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(30);
      }
      setEditingBlock(task.id);
      cleanup();
      beginDrag(target, pointerId, 'move', startX, startY);
    }, LONG_PRESS_MS);

    function onMove(mv: PointerEvent) {
      const dx = mv.clientX - startX;
      const dy = mv.clientY - startY;
      if (Math.abs(dx) > TAP_THRESHOLD_PX || Math.abs(dy) > TAP_THRESHOLD_PX) {
        canceled = true;
        window.clearTimeout(timer);
        cleanup();
      }
    }

    function onUp() {
      canceled = true;
      window.clearTimeout(timer);
      cleanup();
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const handleHandlePointerDown = (
    e: React.PointerEvent,
    kind: 'resize-top' | 'resize-bot',
  ) => {
    if (!editing) return;
    e.stopPropagation();
    e.preventDefault();
    beginDrag(e.currentTarget, e.pointerId, kind, e.clientX, e.clientY);
  };

  useEffect(() => {
    if (!drag) return;

    const onMove = (e: PointerEvent) => {
      const dy = e.clientY - drag.startY;
      const dx = e.clientX - drag.startX;
      if (Math.abs(dx) > TAP_THRESHOLD_PX || Math.abs(dy) > TAP_THRESHOLD_PX) {
        movedRef.current = true;
      }
      const minutes =
        Math.round((dy / hourHeight) * 60 / SNAP_MINUTES) * SNAP_MINUTES;
      let days = 0;
      if (drag.kind === 'move' && columnWidthRef.current > 0) {
        days = Math.round(dx / columnWidthRef.current);
      }
      setDrag((d) => (d ? { ...d, deltaMin: minutes, deltaDays: days } : d));
    };

    const onUp = () => {
      const moved = movedRef.current;
      if (drag.kind === 'move') {
        const total = drag.deltaDays * MINUTES_PER_DAY + drag.deltaMin;
        if (total !== 0) shiftTime(task.id, total);
      } else if (drag.deltaMin !== 0) {
        resizeTime(
          task.id,
          drag.kind === 'resize-top' ? 'start' : 'end',
          drag.deltaMin,
        );
      }
      if (moved) suppressClickUntilRef.current = Date.now() + 300;
      setDrag(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [drag, hourHeight, resizeTime, shiftTime, task.id]);

  if (!startDate || !endDate) return null;

  const baseTop =
    minutesFromStart(startDate, hourStart) * (hourHeight / 60);
  const baseHeight = Math.max(
    24,
    minutesBetween(startDate, endDate) * (hourHeight / 60),
  );

  let top = baseTop;
  let height = baseHeight;
  let translateX = 0;

  if (drag) {
    if (drag.kind === 'move') {
      top = baseTop + drag.deltaMin * (hourHeight / 60);
      translateX = drag.deltaDays * columnWidthRef.current;
    } else if (drag.kind === 'resize-top') {
      top = baseTop + drag.deltaMin * (hourHeight / 60);
      height = Math.max(24, baseHeight - drag.deltaMin * (hourHeight / 60));
    } else {
      height = Math.max(24, baseHeight + drag.deltaMin * (hourHeight / 60));
    }
  }

  const widthPct = 100 / laneInfo.lanes;
  const leftPct = laneInfo.lane * widthPct;

  const isDone = task.status === '완료' || task.status === '취소';
  const isEvent = task.type === '일정';
  const isDragging = drag !== null;

  const showText = height >= 30;
  const compactText = height < 50;

  const handleClick = (e: React.MouseEvent) => {
    if (drag) return;
    if (Date.now() < suppressClickUntilRef.current) {
      e.stopPropagation();
      return;
    }
    if (editing) {
      e.stopPropagation();
      return;
    }
    e.stopPropagation();
    selectTask(task.id);
  };

  const palette = isEvent
    ? {
        body: 'bg-gradient-to-br from-blue-500/25 via-blue-500/15 to-blue-500/5 dark:from-blue-500/35 dark:via-blue-500/20 dark:to-blue-500/10',
        text: 'text-blue-950 dark:text-blue-100',
        bar: 'bg-blue-500',
        ring: 'ring-blue-400/40',
      }
    : {
        body: 'bg-gradient-to-br from-violet-500/25 via-violet-500/15 to-violet-500/5 dark:from-violet-500/35 dark:via-violet-500/20 dark:to-violet-500/10',
        text: 'text-violet-950 dark:text-violet-100',
        bar: 'bg-violet-500',
        ring: 'ring-violet-400/40',
      };

  return (
    <div
      ref={ref}
      onClick={handleClick}
      onPointerDown={handleBodyPointerDown}
      className={cn(
        'group absolute overflow-hidden rounded-xl pl-2.5 pr-1.5 py-1.5 text-[11px] leading-tight select-none',
        'shadow-sm ring-1 transition-all',
        palette.body,
        palette.text,
        palette.ring,
        editing
          ? 'cursor-grab active:cursor-grabbing ring-2 ring-[var(--primary)] shadow-lg touch-none'
          : 'cursor-pointer touch-pan-y',
        isDone && 'opacity-50 line-through',
        isDragging && 'z-50 scale-[1.02] shadow-2xl ring-2 ring-[var(--primary)]/60',
        !isDragging && 'z-10',
      )}
      style={{
        top,
        height,
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
        transform: translateX !== 0 ? `translateX(${translateX}px)` : undefined,
      }}
    >
      <span
        className={cn(
          'absolute left-0 top-0 bottom-0 w-1 rounded-l-xl',
          palette.bar,
        )}
      />

      {editing && !isDragging && (
        <button
          type="button"
          aria-label="선택 해제"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setEditingBlock(null);
          }}
          className="absolute right-1 top-1 z-30 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow"
        >
          <X size={10} strokeWidth={3} />
        </button>
      )}

      {editing && (
        <>
          <div
            onPointerDown={(e) => handleHandlePointerDown(e, 'resize-top')}
            className="absolute inset-x-0 -top-1 z-20 h-3 cursor-ns-resize"
          >
            <div className="mx-auto h-1 w-8 rounded-full bg-[var(--primary)]" />
          </div>
          <div
            onPointerDown={(e) => handleHandlePointerDown(e, 'resize-bot')}
            className="absolute inset-x-0 -bottom-1 z-20 h-3 cursor-ns-resize"
          >
            <div className="mx-auto mt-1.5 h-1 w-8 rounded-full bg-[var(--primary)]" />
          </div>
        </>
      )}

      {showText && (
        <>
          <div
            className={cn(
              'font-bold tracking-tight',
              compactText ? 'truncate text-[10px]' : 'line-clamp-2 text-[12px] leading-snug',
            )}
          >
            {task.title}
          </div>
          {!compactText && (
            <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium opacity-80">
              <Clock size={10} strokeWidth={2.5} />
              {format(startDate, 'a h:mm', { locale: ko })}
              {drag?.kind === 'move' && drag.deltaDays !== 0 && (
                <span className="ml-1 rounded bg-[var(--primary)]/20 px-1 font-bold">
                  {drag.deltaDays > 0 ? `+${drag.deltaDays}일` : `${drag.deltaDays}일`}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function minutesFromStart(d: Date, hourStart: number) {
  return (d.getHours() - hourStart) * 60 + d.getMinutes();
}

function minutesBetween(a: Date, b: Date) {
  return (b.getTime() - a.getTime()) / 60000;
}
