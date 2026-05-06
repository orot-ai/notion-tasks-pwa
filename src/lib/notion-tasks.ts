import 'server-only';
import { notion, TASKS_DB_ID } from '@/lib/notion-client';
import { pageToTask, taskInputToProperties } from '@/lib/notion-mappers';
import type { Task, TaskInput } from '@/types/task';

const PAGE_SIZE = 100;

export async function listTasks(): Promise<Task[]> {
  const all: Task[] = [];
  let cursor: string | undefined = undefined;

  do {
    const res = await notion.databases.query({
      database_id: TASKS_DB_ID,
      page_size: PAGE_SIZE,
      start_cursor: cursor,
      sorts: [{ property: '태스크 기간', direction: 'ascending' }],
    });

    for (const page of res.results) {
      if ('properties' in page) {
        all.push(pageToTask(page as Parameters<typeof pageToTask>[0]));
      }
    }
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return all;
}

export async function createTask(input: TaskInput): Promise<Task> {
  const properties = taskInputToProperties(input);
  const page = await notion.pages.create({
    parent: { database_id: TASKS_DB_ID },
    properties: properties as Parameters<typeof notion.pages.create>[0]['properties'],
  });
  return pageToTask(page as Parameters<typeof pageToTask>[0]);
}

export async function updateTask(
  id: string,
  patch: TaskInput,
): Promise<Task> {
  const properties = taskInputToProperties(patch);
  const page = await notion.pages.update({
    page_id: id,
    properties: properties as Parameters<typeof notion.pages.update>[0]['properties'],
  });
  return pageToTask(page as Parameters<typeof pageToTask>[0]);
}

export async function archiveTask(id: string): Promise<void> {
  await notion.pages.update({
    page_id: id,
    archived: true,
  });
}
