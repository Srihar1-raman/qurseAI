import { NextResponse } from 'next/server';
import { checkGuestRateLimitIP } from '@/lib/redis/rate-limit';
import { getClientIp } from '@/lib/utils/ip-extraction';

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const res = await checkGuestRateLimitIP(ip);
  return NextResponse.json({ ip, ...res });
}