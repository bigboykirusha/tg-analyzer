export const authRateLimitFailurePolicy = {
  // Authentication must never bypass throttling when the shared store is unavailable.
  skipOnError: false,
} as const
