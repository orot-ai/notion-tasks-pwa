'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  value: string | null;
  options: string[];
  onChange: (next: string | null) => void;
}

export function ProjectFilterDropdown({ value, options, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else setQuery('');
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const label = value ?? '모든 프로젝트';

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-colors',
          value
            ? 'bg-[var(--primary)] text-[var(--primary-fg)]'
            : 'border border-[var(--border)] bg-transparent text-foreground',
        )}
      >
        <span className="max-w-32 truncate">{label}</span>
        {value ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="-mr-1 flex h-4 w-4 items-center justify-center rounded-full hover:bg-white/20"
            aria-label="해제"
          >
            <X size={11} strokeWidth={2.5} />
          </span>
        ) : (
          <ChevronDown size={12} className="opacity-70" />
        )}
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 z-40 w-64 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl overflow-hidden">
          <div className="p-2 border-b border-[var(--border)]">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="프로젝트 검색"
              className="w-full rounded-xl bg-[var(--surface-alt)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
            />
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center justify-between px-3 py-2 text-left text-sm',
                value === null
                  ? 'text-[var(--primary)] bg-[var(--primary)]/8'
                  : 'text-foreground hover:bg-[var(--surface-alt)]',
              )}
            >
              <span>모든 프로젝트</span>
              {value === null && <Check size={14} />}
            </button>
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-xs text-[var(--muted)]">
                결과 없음
              </div>
            ) : (
              filtered.map((opt) => {
                const selected = value === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onChange(opt);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between px-3 py-2 text-left text-sm',
                      selected
                        ? 'text-[var(--primary)] bg-[var(--primary)]/8'
                        : 'text-foreground hover:bg-[var(--surface-alt)]',
                    )}
                  >
                    <span className="truncate">{opt}</span>
                    {selected && <Check size={14} className="shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
