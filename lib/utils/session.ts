import 'server-only';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'session_id';
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isValidUUID = (uuid: string): boolean => UUID_V4_REGEX.test(uuid);

export const getOrCreateSessionId = (request: Request): string => {
  const headerCookies = request.headers.get('cookie') ?? '';
  const existing = parseCookie(headerCookies, SESSION_COOKIE_NAME);
  if (existing && isValidUUID(existing)) {
    return existing;
  }
  return crypto.randomUUID();
};

export const setSessionIdCookie = (response: Response, sessionId: string): void => {
  const secure = process.env.NODE_ENV === 'production';
  const cookieValue = `${SESSION_COOKIE_NAME}=${encodeURIComponent(
    sessionId
  )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}${
    secure ? '; Secure' : ''
  }`;
  response.headers.append('Set-Cookie', cookieValue);
};

export const setSessionIdCookieNext = async (sessionId: string): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: sessionId,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === 'production',
  });
};

export const parseCookie = (cookieString: string, name: string): string | null => {
  if (!cookieString) return null;
  const cookiesArr = cookieString.split(';').map((c) => c.trim());
  for (const cookie of cookiesArr) {
    const [key, value] = cookie.split('=');
    if (key === name && value) {
      return decodeURIComponent(value);
    }
  }
  return null;
};

