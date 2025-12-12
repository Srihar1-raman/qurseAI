/**
 * Validate and sanitize return URL for post-auth redirects
 * Prevents open redirect vulnerabilities and ensures security
 * 
 * Industry standard: Only allow relative paths within the application
 * 
 * @param url - The return URL to validate (may be URL-encoded)
 * @returns Validated relative URL or '/' as fallback
 */
export function validateReturnUrl(url: string | null | undefined): string {
  // Default to homepage if no URL provided
  if (!url || typeof url !== 'string') {
    return '/';
  }

  // Decode URL-encoded characters first (defense in depth)
  // Next.js searchParams.get() already decodes, but this handles manual crafting
  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(url);
  } catch {
    // Invalid encoding, reject
    return '/';
  }

  // Split URL into path and query (validate path only, query is handled by page)
  const [path, query] = decodedUrl.split('?');
  const pathToValidate = path || decodedUrl;

  // Must be relative path (starts with '/')
  if (!pathToValidate.startsWith('/')) {
    return '/';
  }

  // Not external URL (no protocol)
  if (pathToValidate.includes('://')) {
    return '/';
  }

  // Not auth pages (avoid redirect loops)
  if (pathToValidate.startsWith('/login') || pathToValidate.startsWith('/signup') || pathToValidate.startsWith('/auth')) {
    return '/';
  }

  // Sanitize path traversal attempts (../ and encoded variants)
  if (pathToValidate.includes('..') || pathToValidate.includes('%2e%2e') || pathToValidate.includes('%2E%2E')) {
    return '/';
  }

  // Sanitize null bytes and other dangerous characters
  if (pathToValidate.includes('\0') || pathToValidate.includes('\r') || pathToValidate.includes('\n')) {
    return '/';
  }

  // Maximum length check (prevent DoS) - check full URL including query
  if (decodedUrl.length > 2048) {
    return '/';
  }

  // Reconstruct URL with validated path and original query (if any)
  // This preserves query params like ?message=hi for conversation pages
  return query ? `${pathToValidate}?${query}` : pathToValidate;
}

