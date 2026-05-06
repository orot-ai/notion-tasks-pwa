'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ListTodo, Calendar, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/', label: '리스트', icon: ListTodo },
  { href: '/timeline', label: '타임라인', icon: Calendar },
  { href: '/month', label: '월간', icon: CalendarDays },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-md items-stretch">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors',
                  active
                    ? 'text-[var(--primary)]'
                    : 'text-[var(--muted)] hover:text-foreground',
                )}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
