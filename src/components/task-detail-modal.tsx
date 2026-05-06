'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { format } from 'date-fns';
import {
  Check,
  CheckCircle2,
  Trash2,
  X,
  XCircle,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { useTasksStore } from '@/store/tasks';
import { TASK_TYPES, TASK_STATUSES, type TaskStatus, type TaskType } from '@/types/task';
import { ProjectMultiSelect } from '@/components/project-multi-select';
import { cn } from '@/lib/utils';

export function TaskDetailModal() {
  const selectedId = useTasksStore((s) => s.selectedId);
  const tasks = useTasksStore((s) => s.tasks);
  const task = useMemo(
    () => tasks.find((t) => t.id === selectedId) ?? null,
    [tasks, selectedId],
  );

  const selectTask = useTasksStore((s) => s.selectTask);
  const update = useTasksStore((s) => s.update);
  const remove = useTasksStore((s) => s.remove);
  const cancel = useTasksStore((s) => s.cancel);
  const toggleDone = useTasksStore((s) => s.toggleDone);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const dragControls = useDragControls();

  useEffect(() => {
    if (!selectedId) setConfirmDelete(false);
  }, [selectedId]);

  if (!task) return null;

  const close = () => selectTask(null);
  const isDone = task.status === '완료' || task.status === '취소';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={close}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 120 || info.velocity.y > 500) close();
        }}
        className="w-full sm:max-w-md bg-[var(--surface)] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div
          onPointerDown={(e) => dragControls.start(e)}
          className="shrink-0 cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="flex justify-center pt-2 pb-1">
            <div className="h-1.5 w-10 rounded-full bg-[var(--border)]" />
          </div>
          <div className="flex items-center justify-between px-4 pb-2">
            <button
              type="button"
              onClick={close}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-alt)]"
            >
              <X size={20} />
            </button>
            <span className="text-xs text-[var(--muted)]">
              {format(new Date(task.createdAt), 'yyyy.M.d HH:mm 생성')}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 space-y-5">
          <input
            type="text"
            value={task.title}
            onChange={(e) => update(task.id, { title: e.target.value })}
            placeholder="제목"
            className={cn(
              'w-full min-w-0 bg-transparent text-xl font-bold tracking-tight outline-none placeholder:text-[var(--muted)]',
              isDone && 'line-through text-[var(--muted)]',
            )}
          />

          <Field label="유형">
            <SegmentedControl
              value={task.type}
              options={TASK_TYPES}
              onChange={(v) => update(task.id, { type: v as TaskType })}
            />
          </Field>

          <Field label="상태">
            <SegmentedControl
              value={task.status}
              options={TASK_STATUSES}
              onChange={(v) => update(task.id, { status: v as TaskStatus })}
            />
          </Field>

          <Field label="시간">
            <div className="space-y-2">
              <DateTimeInput
                label="시작"
                value={task.start}
                onChange={(v) => update(task.id, { start: v })}
              />
              <DateTimeInput
                label="종료"
                value={task.end}
                onChange={(v) => update(task.id, { end: v })}
              />
            </div>
          </Field>

          <Field label="프로젝트">
            <ProjectMultiSelect
              value={task.projects}
              onChange={(v) => update(task.id, { projects: v })}
            />
          </Field>

          <Field label="설명">
            <textarea
              value={task.description}
              onChange={(e) => update(task.id, { description: e.target.value })}
              placeholder="자세한 내용"
              rows={4}
              className="w-full min-w-0 rounded-xl bg-[var(--surface-alt)] px-3 py-2.5 text-sm leading-relaxed outline-none placeholder:text-[var(--muted)] focus:ring-2 focus:ring-[var(--primary)]/40 resize-none"
            />
          </Field>
        </div>

        <div className="shrink-0 grid grid-cols-4 gap-1 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur px-2 py-2">
          <ActionBtn
            label={isDone ? '되살리기' : '완료'}
            icon={<CheckCircle2 size={18} />}
            tone={isDone ? 'muted' : 'done'}
            onClick={() => toggleDone(task.id)}
          />
          <ActionBtn
            label="취소"
            icon={<XCircle size={18} />}
            tone="muted"
            onClick={() => {
              cancel(task.id);
              close();
            }}
          />
          <ActionBtn
            label="다음날"
            icon={<CalendarIcon size={18} />}
            tone="muted"
            onClick={() => {
              if (!task.start) return;
              useTasksStore.getState().moveToTomorrow(task.id);
            }}
          />
          {confirmDelete ? (
            <ActionBtn
              label="진짜 삭제?"
              icon={<Check size={18} />}
              tone="danger"
              onClick={() => {
                remove(task.id);
                close();
              }}
            />
          ) : (
            <ActionBtn
              label="삭제"
              icon={<Trash2 size={18} />}
              tone="danger"
              onClick={() => setConfirmDelete(true)}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

function SegmentedControl({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-2xl bg-[var(--surface-alt)] p-1">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            'flex-1 min-w-[60px] rounded-xl px-2 py-1.5 text-xs font-medium transition-colors',
            value === o
              ? 'bg-[var(--surface)] text-foreground shadow-sm'
              : 'text-[var(--muted)] hover:text-foreground',
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function DateTimeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const local = useMemo(() => {
    if (!value) return { date: '', time: '' };
    const d = new Date(value);
    const tz = d.getTimezoneOffset() * 60000;
    const iso = new Date(d.getTime() - tz).toISOString();
    return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
  }, [value]);

  const setDate = (date: string) => {
    if (!date) {
      onChange(null);
      return;
    }
    const time = local.time || '09:00';
    onChange(new Date(`${date}T${time}`).toISOString());
  };
  const setTime = (time: string) => {
    if (!time) return;
    const date = local.date || new Date().toISOString().slice(0, 10);
    onChange(new Date(`${date}T${time}`).toISOString());
  };

  return (
    <div className="space-y-1 min-w-0">
      <span className="block text-[10px] font-medium text-[var(--muted)]">
        {label}
      </span>
      <div className="grid grid-cols-[1fr_auto] gap-2 min-w-0">
        <input
          type="date"
          value={local.date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full min-w-0 rounded-xl bg-[var(--surface-alt)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
        />
        <input
          type="time"
          value={local.time}
          onChange={(e) => setTime(e.target.value)}
          className="rounded-xl bg-[var(--surface-alt)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
        />
      </div>
    </div>
  );
}

function ActionBtn({
  label,
  icon,
  tone,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  tone: 'done' | 'muted' | 'danger';
  onClick: () => void;
}) {
  const toneClass =
    tone === 'done'
      ? 'text-[var(--accent-done)] hover:bg-[var(--accent-done)]/10'
      : tone === 'danger'
        ? 'text-[var(--accent-overdue)] hover:bg-[var(--accent-overdue)]/10'
        : 'text-foreground hover:bg-[var(--surface-alt)]';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-1 rounded-2xl py-2.5 text-xs font-medium transition-colors',
        toneClass,
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
