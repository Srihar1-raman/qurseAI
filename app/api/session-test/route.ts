import { NextResponse } from 'next/server';
import { getOrCreateSessionId, setSessionIdCookie } from '@/lib/utils/session';
import { hmacSessionId } from '@/lib/utils/session-hash';

export async function GET(request: Request) {
  const sessionId = getOrCreateSessionId(request);
  const sessionHash = hmacSessionId(sessionId);
  const response = NextResponse.json({ sessionId, sessionHash });
  setSessionIdCookie(response, sessionId);
  return response;
}
