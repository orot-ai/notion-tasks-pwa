import 'server-only';
import { getIronSession, type SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  authed?: boolean;
  authedAt?: number;
}

const password =
  process.env.SESSION_SECRET ??
  'tasks-app-default-secret-please-set-SESSION_SECRET-32-chars';

export const sessionOptions: SessionOptions = {
  cookieName: 'tasks_session',
  password,
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30일
  },
};

export async function getSession() {
  const store = await cookies();
  return getIronSession<SessionData>(store, sessionOptions);
}

export async function isAuthenticated() {
  const session = await getSession();
  return Boolean(session.authed);
}

export function getPasscode() {
  return process.env.PASSCODE ?? '';
}

export function isPasscodeConfigured() {
  return Boolean(process.env.PASSCODE);
}
