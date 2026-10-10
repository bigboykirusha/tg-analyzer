export function buildApiPath(path: string, params: Readonly<Record<string, string>> = {}) {
  const requiredNames = Array.from(path.matchAll(/:([A-Za-z][A-Za-z0-9_]*)/g), (match) => match[1]).filter(
    (name): name is string => name !== undefined,
  )
  const required = new Set(requiredNames)

  for (const name of required) {
    if (!(name in params)) {
      throw new Error(`Missing route parameter: ${name}`)
    }
  }

  for (const name of Object.keys(params)) {
    if (!required.has(name)) {
      throw new Error(`Unexpected route parameter: ${name}`)
    }
  }

  return path.replace(/:([A-Za-z][A-Za-z0-9_]*)/g, (_match, name: string) => encodeURIComponent(params[name] ?? ''))
}
