import type { z } from 'zod'
import { badRequest } from '../lib/errors'

export function parse<Schema extends z.ZodType>(schema: Schema, value: unknown): z.output<Schema> {
  const result = schema.safeParse(value ?? {})
  if (!result.success) {
    const issue = result.error.issues[0]
    throw badRequest(issue ? `${issue.path.join('.') || 'body'}: ${issue.message}` : undefined)
  }
  return result.data
}
