import { NextResponse } from 'next/server';
import { checkAndIncrementRateLimit } from '@/lib/db/rate-limits.server';

export async function GET(request: Request) {
  const mode = new URL(request.url).searchParams.get('mode') ?? 'guest';
  const params = mode === 'user'
    ? { userId: 'user real existing uuid here', limit: 20 }
    : { sessionHash: 'test-guest', limit: 10 };
  const res = await checkAndIncrementRateLimit({ ...params });
  return NextResponse.json({ mode, ...res });
}