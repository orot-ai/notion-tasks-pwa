'use client';

import { useEffect, useState } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { Mic, Plus, X } from 'lucide-react';
import { useTasksStore } from '@/store/tasks';
import { ProjectMultiSelect } from '@/components/project-multi-select';
import { TASK_TYPES, type TaskType } from '@/types/task';
import { cn } from '@/lib/utils';

export function QuickAddModal() {
  const { open, defaultStart, defaultEnd } = useTasksStore((s) => s.quickAddOpen);
  const close = useTasksStore((s) => s.closeQuickAdd);
  const add = useTasksStore((s) => s.add);
  const selectTask = useTasksStore((s) => s.selectTask);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<TaskType>('할일');
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [projects, setProjects] = useState<string[]>([]);
  const [listening, setListening] = useState(false);

  const dragControls = useDragControls();

  useEffect(() => {
    if (open) {
      setTitle('');
      setType('할일');
      setStart(defaultStart ?? null);
      setEnd(defaultEnd ?? null);
      setProjects([]);
    }
  }, [open, defaultStart, defaultEnd]);

  if (!open) return null;

  const submit = (openDetail = false) => {
    if (!title.trim()) return;
    const id = add({ title: title.trim(), type, start, end, projects });
    close();
    if (openDetail) selectTask(id);
  };

  const startVoice = () => {
    const SpeechRecognitionCtor =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : undefined;
    if (!SpeechRecognitionCtor) {
      alert('이 브라우저는 음성 입력을 지원하지 않아요. (Chrome 권장)');
      return;
    }
    const rec = new SpeechRecognitionCtor();
    rec.lang = 'ko-KR';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript ?? '';
      setTitle((t) => (t ? `${t} ${transcript}` : transcript));
    };
    rec.start();
  };

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
            <span className="text-sm font-semibold">새 태스크</span>
            <button
              type="button"
              onClick={() => submit(false)}
              onPointerDown={(e) => e.stopPropagation()}
              disabled={!title.trim()}
              className="flex h-9 items-center gap-1 rounded-full bg-[var(--primary)] px-3 text-sm font-semibold text-[var(--primary-fg)] disabled:opacity-40"
            >
              <Plus size={16} />
              추가
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 space-y-5">
          <div className="relative min-w-0">
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit(false);
                }
              }}
              placeholder="뭘 해야 하지?"
              className="w-full min-w-0 bg-transparent text-xl font-bold tracking-tight outline-none placeholder:text-[var(--muted)] pr-12"
            />
            <button
              type="button"
              onClick={startVoice}
              aria-label="음성 입력"
              className={cn(
                'absolute right-0 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full transition-colors',
                listening
                  ? 'bg-[var(--accent-overdue)] text-white animate-pulse'
                  : 'text-[var(--muted)] hover:bg-[var(--surface-alt)]',
              )}
            >
              <Mic size={18} />
            </button>
          </div>

          <div className="flex gap-1.5">
            {TASK_TYPES.map((tp) => (
              <button
                key={tp}
                type="button"
                onClick={() => setType(tp)}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-xs font-medium',
                  type === tp
                    ? 'bg-foreground text-[var(--background)]'
                    : 'bg-[var(--surface-alt)] text-[var(--muted)]',
                )}
              >
                {tp}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <DateField label="시작" value={start} onChange={setStart} />
            <DateField label="종료" value={end} onChange={setEnd} />
          </div>

          <ProjectMultiSelect value={projects} onChange={setProjects} />
        </div>
      </motion.div>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const local = (() => {
    if (!value) return { date: '', time: '' };
    const d = new Date(value);
    const tz = d.getTimezoneOffset() * 60000;
    const iso = new Date(d.getTime() - tz).toISOString();
    return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
  })();

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
