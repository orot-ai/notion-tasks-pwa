import { NextResponse } from 'next/server';
import { isNotionConfigured } from '@/lib/notion-client';
import { updateTask, archiveTask } from '@/lib/notion-tasks';
import type { TaskInput } from '@/types/task';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Context {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, ctx: Context) {
  if (!isNotionConfigured()) {
    return NextResponse.json(
      { error: 'NOTION_TOKEN not configured' },
      { status: 500 },
    );
  }
  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as TaskInput;
    const task = await updateTask(id, body);
    return NextResponse.json({ task });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_request: Request, ctx: Context) {
  if (!isNotionConfigured()) {
    return NextResponse.json(
      { error: 'NOTION_TOKEN not configured' },
      { status: 500 },
    );
  }
  try {
    const { id } = await ctx.params;
    await archiveTask(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

function errorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return NextResponse.json({ error: message }, { status: 500 });
}
