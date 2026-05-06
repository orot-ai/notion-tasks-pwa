import 'server-only';
import { Client } from '@notionhq/client';

const token = process.env.NOTION_TOKEN;
if (!token) {
  console.warn('[notion-client] NOTION_TOKEN is not set');
}

export const notion = new Client({
  auth: token ?? '',
  notionVersion: '2022-06-28',
});

export const TASKS_DB_ID = process.env.NOTION_TASKS_DB_ID ?? '';

export function isNotionConfigured() {
  return Boolean(process.env.NOTION_TOKEN && process.env.NOTION_TASKS_DB_ID);
}
