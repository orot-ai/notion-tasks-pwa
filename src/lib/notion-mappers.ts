import type { Task, TaskInput, TaskStatus, TaskType } from '@/types/task';

interface NotionPageLite {
  id: string;
  created_time: string;
  properties: Record<string, unknown>;
}

const VALID_STATUSES: TaskStatus[] = ['예정', '진행중', '보류', '완료', '취소'];
const VALID_TYPES: TaskType[] = ['일정', '할일'];

export function pageToTask(page: NotionPageLite): Task {
  const props = page.properties;

  const title = readTitle(props['태스크']) ?? '제목 없음';
  const period = readDate(props['태스크 기간']);
  const status = readStatus(props['상태'], VALID_STATUSES) ?? '예정';
  const type = readSelect(props['유형'], VALID_TYPES) ?? '할일';
  const projects = readMultiSelect(props['프로젝트명']);
  const description = readRichText(props['설명']) ?? '';

  return {
    id: page.id,
    notionId: page.id,
    title,
    start: period?.start ?? null,
    end: period?.end ?? null,
    status,
    type,
    projects,
    description,
    createdAt: page.created_time,
  };
}

export function taskInputToProperties(input: TaskInput) {
  const props: Record<string, unknown> = {};

  if (input.title !== undefined) {
    props['태스크'] = {
      title: [{ text: { content: input.title } }],
    };
  }
  if (input.status !== undefined) {
    props['상태'] = { status: { name: input.status } };
  }
  if (input.type !== undefined) {
    props['유형'] = { select: { name: input.type } };
  }
  if (input.projects !== undefined) {
    props['프로젝트명'] = {
      multi_select: input.projects.map((name) => ({ name })),
    };
  }
  if (input.description !== undefined) {
    props['설명'] = {
      rich_text: input.description
        ? [{ text: { content: input.description } }]
        : [],
    };
  }
  if (input.start !== undefined || input.end !== undefined) {
    if (input.start === null) {
      props['태스크 기간'] = { date: null };
    } else if (input.start) {
      props['태스크 기간'] = {
        date: {
          start: input.start,
          ...(input.end ? { end: input.end } : {}),
        },
      };
    }
  }

  return props;
}

interface TitleProp { type: 'title'; title: Array<{ plain_text: string }>; }
interface DateProp { type: 'date'; date: { start: string | null; end: string | null } | null; }
interface SelectProp { type: 'select'; select: { name: string } | null; }
interface MultiSelectProp { type: 'multi_select'; multi_select: Array<{ name: string }>; }
interface StatusProp { type: 'status'; status: { name: string } | null; }
interface RichTextProp { type: 'rich_text'; rich_text: Array<{ plain_text: string }>; }

function readTitle(prop: unknown): string | null {
  if (!isProp<TitleProp>(prop, 'title')) return null;
  return prop.title.map((t) => t.plain_text).join('') || null;
}

function readDate(prop: unknown): { start: string | null; end: string | null } | null {
  if (!isProp<DateProp>(prop, 'date') || !prop.date) return null;
  return { start: prop.date.start, end: prop.date.end };
}

function readSelect<T extends string>(
  prop: unknown,
  valid: readonly T[],
): T | null {
  if (!isProp<SelectProp>(prop, 'select') || !prop.select) return null;
  return valid.includes(prop.select.name as T) ? (prop.select.name as T) : null;
}

function readStatus<T extends string>(
  prop: unknown,
  valid: readonly T[],
): T | null {
  if (!isProp<StatusProp>(prop, 'status') || !prop.status) return null;
  return valid.includes(prop.status.name as T) ? (prop.status.name as T) : null;
}

function readMultiSelect(prop: unknown): string[] {
  if (!isProp<MultiSelectProp>(prop, 'multi_select')) return [];
  return prop.multi_select.map((o) => o.name);
}

function readRichText(prop: unknown): string | null {
  if (!isProp<RichTextProp>(prop, 'rich_text')) return null;
  return prop.rich_text.map((t) => t.plain_text).join('') || null;
}

function isProp<T extends { type: string }>(
  prop: unknown,
  type: T['type'],
): prop is T {
  return (
    typeof prop === 'object' &&
    prop !== null &&
    'type' in prop &&
    (prop as { type: string }).type === type
  );
}
