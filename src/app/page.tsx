'use client';

import { useMemo, useState } from 'react';
import {
  endOfWeek,
  isThisWeek,
  startOfWeek,
  subWeeks,
} from 'date-fns';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { useTasksStore } from '@/store/tasks';
import { SwipeableCard } from '@/components/swipeable-card';
import { SkeletonList } from '@/components/skeleton-list';
import { ProjectFilterDropdown } from '@/components/project-filter-dropdown';
import { refreshTasks } from '@/components/tasks-hydrator';
import {
  GROUP_LABELS,
  GROUP_ORDER,
  GROUP_COLORS,
  groupTasks,
  type Group,
} from '@/lib/group-tasks';
import type { Task, TaskType } from '@/types/task';
import { cn } from '@/lib/utils';

type DoneFilter = '미완료' | '완료' | '취소';
type TypeFilter = '전체' | TaskType;
type TimeFilter = '이번주' | '지난주' | '전체';

const DONE_FILTERS: DoneFilter[] = ['미완료', '완료', '취소'];
const TYPE_FILTERS: TypeFilter[] = ['전체', '일정', '할일'];
const TIME_FILTERS: TimeFilter[] = ['이번주', '지난주', '전체'];

export default function ListPage() {
  const tasks = useTasksStore((s) => s.tasks);
  const hydrated = useTasksStore((s) => s.hydrated);
  const syncing = useTasksStore((s) => s.syncing);
  const openQuickAdd = useTasksStore((s) => s.openQuickAdd);

  const [doneFilter, setDoneFilter] = useState<DoneFilter>('미완료');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('전체');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('이번주');
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const lastWeekRange = useMemo(() => {
    const now = new Date();
    const last = subWeeks(now, 1);
    return {
      start: startOfWeek(last, { weekStartsOn: 1 }),
      end: endOfWeek(last, { weekStartsOn: 1 }),
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (doneFilter === '미완료' && (t.status === '완료' || t.status === '취소')) return false;
      if (doneFilter === '완료' && t.status !== '완료') return false;
      if (doneFilter === '취소' && t.status !== '취소') return false;
      if (typeFilter !== '전체' && t.type !== typeFilter) return false;
      if (projectFilter && !t.projects.includes(projectFilter)) return false;

      if (doneFilter !== '미완료' && timeFilter !== '전체') {
        const date = t.start
          ? new Date(t.start)
          : t.createdAt
            ? new Date(t.createdAt)
            : null;
        if (!date) return false;
        if (timeFilter === '이번주') {
          if (!isThisWeek(date, { weekStartsOn: 1 })) return false;
        } else if (timeFilter === '지난주') {
          if (date < lastWeekRange.start || date > lastWeekRange.end) {
            return false;
          }
        }
      }

      if (q) {
        const hay = `${t.title} ${t.description} ${t.projects.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, doneFilter, typeFilter, projectFilter, timeFilter, search, lastWeekRange]);

  const availableProjects = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) for (const p of t.projects) set.add(p);
    return Array.from(set).sort();
  }, [tasks]);

  const grouped = useMemo(() => groupTasks(filtered), [filtered]);

  const refresh = () => void refreshTasks();

  const visibleGroups = (
    doneFilter === '미완료'
      ? GROUP_ORDER.filter((g) => g !== 'done')
      : (['done'] as const)
  ) as readonly Group[];

  return (
    <div className="mx-auto w-full max-w-md">
      <header className="sticky top-0 z-30 bg-[var(--background)]/85 backdrop-blur-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <h1 className="text-2xl font-bold tracking-tight">할일</h1>
          <div className="flex items-center gap-1">
            <IconBtn label="검색" onClick={() => setSearchOpen((v) => !v)}>
              <Search size={20} />
            </IconBtn>
            <IconBtn label="새로고침" onClick={refresh}>
              <RefreshCw size={20} className={cn(syncing && 'animate-spin')} />
            </IconBtn>
          </div>
        </div>

        {searchOpen && (
          <div className="px-5 pb-2">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="태스크·프로젝트·설명에서 검색"
              className="w-full rounded-xl bg-[var(--surface-alt)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
            />
          </div>
        )}

        <div className="px-5 pb-2">
          <div className="inline-flex w-full rounded-full bg-[var(--surface-alt)] p-0.5">
            {DONE_FILTERS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDoneFilter(d)}
                className={cn(
                  'flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition-all',
                  doneFilter === d
                    ? 'bg-[var(--surface)] text-foreground shadow-sm'
                    : 'text-[var(--muted)]',
                )}
              >
                {d}
                <span className="ml-1.5 text-xs font-normal opacity-70">
                  {countByDone(tasks, d)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {doneFilter !== '미완료' && (
          <div className="flex gap-1.5 px-5 pb-2 overflow-x-auto">
            {TIME_FILTERS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTimeFilter(t)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  timeFilter === t
                    ? 'bg-foreground text-[var(--background)]'
                    : 'bg-transparent text-[var(--muted)] border border-[var(--border)]',
                )}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-1.5 px-5 pb-2 overflow-x-auto">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setTypeFilter(f)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                typeFilter === f
                  ? 'bg-foreground text-[var(--background)]'
                  : 'bg-transparent text-[var(--muted)] border border-[var(--border)]',
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {availableProjects.length > 0 && (
          <div className="flex gap-1.5 px-5 pb-3">
            <ProjectFilterDropdown
              value={projectFilter}
              options={availableProjects}
              onChange={setProjectFilter}
            />
          </div>
        )}
      </header>

      <div className="px-3 pb-6">
        {!hydrated ? (
          <SkeletonList />
        ) : (
          <>
            {visibleGroups.map((group) => {
              const items = grouped[group];
              if (items.length === 0) return null;
              return <GroupSection key={group} group={group} tasks={items} />;
            })}

            {filtered.length === 0 && (
              <div className="mt-24 text-center text-[var(--muted)]">
                <p className="text-sm">
                  {tasks.length === 0
                    ? '노션에서 태스크를 가져오는 중이거나 비어있어요.'
                    : '필터 조건에 맞는 태스크가 없어요.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <FloatingActions onAdd={() => openQuickAdd()} />
    </div>
  );
}

function GroupSection({ group, tasks }: { group: Group; tasks: Task[] }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <h2 className="flex items-center gap-2 text-[13px] font-bold tracking-tight uppercase text-foreground/80">
          <span className={cn('h-2 w-2 rounded-full', GROUP_COLORS[group])} />
          {GROUP_LABELS[group]}
          <span className="text-xs font-medium text-[var(--muted)]">{tasks.length}</span>
        </h2>
        <span className="text-[11px] font-medium text-[var(--muted)]">
          {open ? '접기' : '펼치기'}
        </span>
      </button>
      {open && (
        <div className="space-y-1">
          {tasks.map((t) => (
            <SwipeableCard key={t.id} task={t} />
          ))}
        </div>
      )}
    </section>
  );
}

function FloatingActions({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      className="fixed right-5 z-30 flex flex-col gap-3"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 88px)' }}
    >
      <button
        type="button"
        onClick={onAdd}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-fg)] shadow-xl shadow-indigo-500/30 active:scale-95 transition-transform"
        aria-label="새 태스크"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-alt)] hover:text-foreground transition-colors"
    >
      {children}
    </button>
  );
}

function countByDone(tasks: Task[], filter: DoneFilter) {
  return tasks.filter((t) => {
    if (filter === '미완료') return t.status !== '완료' && t.status !== '취소';
    if (filter === '완료') return t.status === '완료';
    return t.status === '취소';
  }).length;
}
