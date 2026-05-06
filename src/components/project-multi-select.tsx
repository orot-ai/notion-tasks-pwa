'use client';

import { useMemo, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { useTasksStore } from '@/store/tasks';
import { cn } from '@/lib/utils';

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
}

export function ProjectMultiSelect({ value, onChange }: Props) {
  const projects = useTasksStore((s) => s.projects);
  const addProject = useTasksStore((s) => s.addProject);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.toLowerCase().includes(q));
  }, [projects, query]);

  const canCreate =
    query.trim().length > 0 &&
    !projects.some((p) => p.toLowerCase() === query.trim().toLowerCase());

  const toggle = (name: string) => {
    if (value.includes(name)) onChange(value.filter((p) => p !== name));
    else onChange([...value, name]);
  };

  const create = () => {
    const name = query.trim();
    if (!name) return;
    addProject(name);
    if (!value.includes(name)) onChange([...value, name]);
    setQuery('');
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => toggle(p)}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)]/12 px-2.5 py-1 text-xs font-medium text-[var(--primary)]"
            >
              {p}
              <X size={12} />
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="프로젝트 검색 또는 새로 만들기"
          className="w-full rounded-xl bg-[var(--surface-alt)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canCreate) {
              e.preventDefault();
              create();
            }
          }}
        />
      </div>

      <div className="max-h-44 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-alt)]/50">
        {filtered.length === 0 && !canCreate && (
          <div className="px-3 py-3 text-xs text-[var(--muted)]">
            결과 없음
          </div>
        )}
        {filtered.map((p) => {
          const checked = value.includes(p);
          return (
            <button
              key={p}
              type="button"
              onClick={() => toggle(p)}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                checked
                  ? 'text-[var(--primary)] bg-[var(--primary)]/8'
                  : 'text-foreground hover:bg-[var(--surface)]',
              )}
            >
              <span
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded border',
                  checked
                    ? 'bg-[var(--primary)] border-[var(--primary)]'
                    : 'border-[var(--border)]',
                )}
              >
                {checked && <Check size={12} className="text-white" />}
              </span>
              <span className="truncate">{p}</span>
            </button>
          );
        })}
        {canCreate && (
          <button
            type="button"
            onClick={create}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--primary)] hover:bg-[var(--primary)]/8 border-t border-[var(--border)]"
          >
            <Plus size={14} />
            <span className="truncate">&ldquo;{query.trim()}&rdquo; 새 프로젝트 만들기</span>
          </button>
        )}
      </div>
    </div>
  );
}
