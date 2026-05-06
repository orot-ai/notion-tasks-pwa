import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { BottomNav } from '@/components/bottom-nav';
import { TaskDetailModal } from '@/components/task-detail-modal';
import { QuickAddModal } from '@/components/quick-add-modal';
import { TasksHydrator } from '@/components/tasks-hydrator';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Tasks',
  description: '미리님 노션 TASK 모바일 앱',
  applicationName: 'Tasks',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Tasks',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-dvh flex flex-col bg-background text-foreground">
        <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+72px)]">
          {children}
        </main>
        <BottomNav />
        <TaskDetailModal />
        <QuickAddModal />
        <TasksHydrator />
      </body>
    </html>
  );
}
