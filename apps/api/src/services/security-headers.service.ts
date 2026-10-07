/**
 * Response headers shared by every API route. The API does not render HTML, so
 * a deny-by-default policy is both safer and less permissive than a browser UI
 * policy.
 */
export const apiSecurityHeaders = {
  'content-security-policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  'x-frame-options': 'DENY',
  'permissions-policy': 'camera=(), geolocation=(), microphone=()',
} as const
