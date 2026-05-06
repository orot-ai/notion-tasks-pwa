export type TaskStatus = '예정' | '진행중' | '보류' | '완료' | '취소';
export type TaskType = '일정' | '할일';

export interface Task {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  status: TaskStatus;
  type: TaskType;
  projects: string[];
  description: string;
  createdAt: string;
  notionId?: string;
}

export interface TaskInput {
  title: string;
  start?: string | null;
  end?: string | null;
  status?: TaskStatus;
  type?: TaskType;
  projects?: string[];
  description?: string;
}

export const TASK_STATUSES: TaskStatus[] = ['예정', '진행중', '보류', '완료', '취소'];
export const TASK_TYPES: TaskType[] = ['일정', '할일'];

// 노션 DB의 `프로젝트명` multi_select 옵션 시드.
// 비워두면 첫 동기화 시 노션에서 받아온 값으로 자동 채워진다.
export const PROJECT_OPTIONS: readonly string[] = [];
