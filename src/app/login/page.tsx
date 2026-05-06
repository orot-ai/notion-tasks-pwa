'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const CODE_LENGTH = 6;

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const params = useSearchParams();
  const next = params.get('next') ?? '/';

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async (c: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: c }),
      });
      if (res.ok) {
        window.location.href = next;
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error === 'invalid code' ? '코드가 틀려요' : '로그인 실패');
      setCode('');
      setSubmitting(false);
    } catch {
      setError('네트워크 오류');
      setCode('');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--background)] px-6">
      <div className="mx-auto w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)]/12 text-[var(--primary)]">
          <Lock size={24} strokeWidth={2.5} />
        </div>
        <h1 className="text-xl font-bold tracking-tight">잠금 해제</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">6자리 코드 입력</p>

        <div
          className="relative mt-8 mx-auto"
          onClick={() => inputRef.current?.focus()}
        >
          <div className="flex justify-center gap-2 pointer-events-none">
            {Array.from({ length: CODE_LENGTH }).map((_, i) => {
              const filled = i < code.length;
              return (
                <div
                  key={i}
                  className={cn(
                    'h-12 w-10 rounded-xl border-2 flex items-center justify-center text-2xl font-bold',
                    filled
                      ? 'border-[var(--primary)] bg-[var(--primary)]/8 text-foreground'
                      : 'border-[var(--border)] text-[var(--muted)]/40',
                  )}
                >
                  {filled ? '●' : '·'}
                </div>
              );
            })}
          </div>

          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            autoFocus
            value={code}
            maxLength={CODE_LENGTH}
            disabled={submitting}
            onChange={(e) => {
              const value = e.target.value
                .replace(/[^a-zA-Z0-9]/g, '')
                .slice(0, CODE_LENGTH);
              setCode(value);
              setError(null);
              if (value.length === CODE_LENGTH) {
                void submit(value);
              }
            }}
            className="absolute inset-0 w-full bg-transparent text-transparent caret-transparent outline-none focus:outline-none"
            style={{ WebkitTextFillColor: 'transparent' }}
            aria-label="패스코드"
          />
        </div>

        {error && (
          <p className="mt-6 text-sm font-medium text-[var(--accent-overdue)]">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.focus()}
          className="mt-6 text-xs text-[var(--muted)] underline-offset-4 hover:underline"
        >
          입력이 안 보이면 여기를 탭
        </button>
      </div>
    </div>
  );
}
