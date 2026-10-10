const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]'])

function parseOrigin(value: string) {
  try {
    const url = new URL(value)
    return url.origin === value ? url : null
  } catch {
    return null
  }
}

export function isOriginAllowed(
  origin: string,
  allowedOrigins: readonly string[],
  environment: 'development' | 'test' | 'production',
) {
  if (allowedOrigins.includes(origin)) {
    return true
  }

  if (environment === 'production') {
    return false
  }

  if (allowedOrigins.includes('*')) {
    return true
  }

  const requestOrigin = parseOrigin(origin)
  if (!requestOrigin || !loopbackHosts.has(requestOrigin.hostname)) {
    return false
  }

  return allowedOrigins.some((allowedOrigin) => {
    const configuredOrigin = parseOrigin(allowedOrigin)
    return (
      configuredOrigin !== null &&
      loopbackHosts.has(configuredOrigin.hostname) &&
      configuredOrigin.protocol === requestOrigin.protocol &&
      configuredOrigin.port === requestOrigin.port
    )
  })
}
