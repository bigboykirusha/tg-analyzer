import type { AuditAction, AuditEntryDto } from '@tg-analyzer/shared'
import { schema, type Database, type Transaction } from '../../db'

export interface AuditInput {
  teamId: string
  actorId: string
  subjectId?: string
  action: AuditAction
  details?: AuditEntryDto['details']
}

/** Appends to the team's log inside the caller's transaction, so an action and its record land together. */
export async function recordAudit(tx: Database | Transaction, input: AuditInput) {
  await tx.insert(schema.teamAuditLog).values({
    teamId: input.teamId,
    actorId: input.actorId,
    subjectId: input.subjectId ?? null,
    action: input.action,
    details: input.details ?? {},
  })
}
