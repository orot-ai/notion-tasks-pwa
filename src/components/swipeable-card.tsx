'use client';

import { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import type { Task } from '@/types/task';
import { TaskCard } from '@/components/task-card';
import { useTasksStore } from '@/store/tasks';

const THRESHOLD = 96;

interface Props {
  task: Task;
}

export function SwipeableCard({ task }: Props) {
  const x = useMotionValue(0);
  const [committing, setCommitting] = useState<'done' | 'next' | null>(null);

  const toggleDone = useTasksStore((s) => s.toggleDone);
  const moveToTomorrow = useTasksStore((s) => s.moveToTomorrow);
  const selectTask = useTasksStore((s) => s.selectTask);

  const doneOpacity = useTransform(x, [-THRESHOLD * 1.4, -8, 0], [1, 0.2, 0]);
  const nextOpacity = useTransform(x, [0, 8, THRESHOLD * 1.4], [0, 0.2, 1]);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <motion.div
        style={{ opacity: doneOpacity }}
        className="absolute inset-0 flex items-center justify-end pr-6 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      >
        <div className="flex items-center gap-2 text-sm font-bold">
          <CheckCircle2 size={20} />
          완료
        </div>
      </motion.div>
      <motion.div
        style={{ opacity: nextOpacity }}
        className="absolute inset-0 flex items-center justify-start pl-6 bg-amber-500/15 text-amber-600 dark:text-amber-400"
      >
        <div className="flex items-center gap-2 text-sm font-bold">
          <ArrowRight size={20} />
          다음날로
        </div>
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        style={{ x }}
        animate={{ x: committing ? (committing === 'done' ? -400 : 400) : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -THRESHOLD) {
            setCommitting('done');
            setTimeout(() => {
              toggleDone(task.id);
              setCommitting(null);
              x.set(0);
            }, 180);
          } else if (info.offset.x > THRESHOLD) {
            setCommitting('next');
            setTimeout(() => {
              moveToTomorrow(task.id);
              setCommitting(null);
              x.set(0);
            }, 180);
          } else {
            x.set(0);
          }
        }}
        className="relative bg-[var(--background)]"
      >
        <TaskCard
          task={task}
          onToggle={toggleDone}
          onClick={(t) => selectTask(t.id)}
        />
      </motion.div>
    </div>
  );
}
