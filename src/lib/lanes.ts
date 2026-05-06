import type { Task } from '@/types/task';

export interface LaneInfo {
  lane: number;
  lanes: number;
}

export function assignLanes(tasks: Task[]): Map<string, LaneInfo> {
  const result = new Map<string, LaneInfo>();
  if (tasks.length === 0) return result;

  const sorted = [...tasks].sort((a, b) => {
    const aS = new Date(a.start!).getTime();
    const bS = new Date(b.start!).getTime();
    if (aS !== bS) return aS - bS;
    const aE = a.end ? new Date(a.end).getTime() : aS + 3600000;
    const bE = b.end ? new Date(b.end).getTime() : bS + 3600000;
    return aE - bE;
  });

  const groups: Task[][] = [];
  let current: Task[] = [];
  let groupEnd = 0;

  for (const t of sorted) {
    const start = new Date(t.start!).getTime();
    const end = t.end ? new Date(t.end).getTime() : start + 3600000;

    if (current.length > 0 && start >= groupEnd) {
      groups.push(current);
      current = [];
      groupEnd = 0;
    }
    current.push(t);
    if (end > groupEnd) groupEnd = end;
  }
  if (current.length > 0) groups.push(current);

  for (const group of groups) {
    const laneEnds: number[] = [];
    const ids: string[] = [];

    for (const t of group) {
      const start = new Date(t.start!).getTime();
      const end = t.end ? new Date(t.end).getTime() : start + 3600000;

      let lane = laneEnds.findIndex((e) => e <= start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(end);
      } else {
        laneEnds[lane] = end;
      }
      result.set(t.id, { lane, lanes: 0 });
      ids.push(t.id);
    }

    const total = laneEnds.length;
    for (const id of ids) {
      const info = result.get(id)!;
      info.lanes = total;
    }
  }

  return result;
}
