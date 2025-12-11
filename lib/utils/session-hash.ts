import { createHash } from 'crypto';

const secret = process.env.SESSION_HMAC_SECRET;

if (!secret) {
  throw new Error('SESSION_HMAC_SECRET is required');
}

export const hmacSessionId = (sessionId: string): string => {
  return createHash('sha256').update(`${secret}:${sessionId}`).digest('base64url');
};

