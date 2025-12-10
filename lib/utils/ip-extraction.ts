const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/i;
const ipv6MappedRegex = /^::ffff:(\d{1,3}\.){3}\d{1,3}$/;

export function isValidIp(ip: string): boolean {
  if (!ip) return false;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ipv6MappedRegex.test(ip);
}

/**
 * Extract client IP from request headers
 * Order: x-forwarded-for (first IP) → x-real-ip → 'unknown'
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp && isValidIp(firstIp)) {
      return firstIp;
    }
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp && isValidIp(realIp)) {
    return realIp.trim();
  }

  return 'unknown';
}

