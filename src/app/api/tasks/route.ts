import { NextResponse } from 'next/server';
import { isNotionConfigured } from '@/lib/notion-client';
import { listTasks, createTask } from '@/lib/notion-tasks';
import type { TaskInput } from '@/types/task';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isNotionConfigured()) {
    return NextResponse.json(
      { error: 'NOTION_TOKEN not configured' },
      { status: 500 },
    );
  }
  try {
    const tasks = await listTasks();
    return NextResponse.json({ tasks });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  if (!isNotionConfigured()) {
    return NextResponse.json(
      { error: 'NOTION_TOKEN not configured' },
      { status: 500 },
    );
  }
  try {
    const body = (await request.json()) as TaskInput;
    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'title required' }, { status: 400 });
    }
    const task = await createTask(body);
    return NextResponse.json({ task });
  } catch (err) {
    return errorResponse(err);
  }
}

function errorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return NextResponse.json({ error: message }, { status: 500 });
}
