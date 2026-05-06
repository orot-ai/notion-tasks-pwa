import { NextResponse } from 'next/server';
import { getSession, getPasscode, isPasscodeConfigured } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isPasscodeConfigured()) {
    return NextResponse.json(
      { error: 'PASSCODE not configured on server' },
      { status: 500 },
    );
  }
  const body = (await request.json()) as { code?: unknown };
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (code.length === 0) {
    return NextResponse.json({ error: 'code required' }, { status: 400 });
  }
  if (code !== getPasscode()) {
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: 'invalid code' }, { status: 401 });
  }
  const session = await getSession();
  session.authed = true;
  session.authedAt = Date.now();
  await session.save();
  return NextResponse.json({ ok: true });
}
