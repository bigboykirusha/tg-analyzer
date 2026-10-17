import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import type { ChatReport, ChatType, ContactStatsDto, JobStatus, PeopleOverviewStatus } from '@tg-analyzer/shared'

const createdAt = () => timestamp('created_at', { withTimezone: true }).defaultNow().notNull()

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tgUserId: bigint('tg_user_id', { mode: 'number' }).notNull().unique(),
  tgPhone: varchar('tg_phone', { length: 20 }),
  username: varchar('username', { length: 255 }),
  firstName: varchar('first_name', { length: 255 }),
  /** IANA time zone used to bucket report activity. */
  timezone: varchar('timezone', { length: 64 }).default('UTC').notNull(),
  createdAt: createdAt(),
  lastLogin: timestamp('last_login', { withTimezone: true }),
})

/** One encrypted Telegram authorization per user (AES-256-GCM). */
export const telegramSessions = pgTable(
  'telegram_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sessionString: text('session_string').notNull(),
    sessionIv: text('session_iv').notNull(),
    authTag: text('auth_tag').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex('telegram_sessions_user_id_idx').on(table.userId)],
)

export const parseJobs = pgTable(
  'parse_jobs',
  {
    /** Also used as the BullMQ job id. */
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Null only for legacy "all chats" jobs. */
    chatId: bigint('chat_id', { mode: 'number' }),
    chatTitle: varchar('chat_name', { length: 500 }),
    status: varchar('status', { length: 20 }).$type<JobStatus>().default('pending').notNull(),
    totalMessages: bigint('total_messages', { mode: 'number' }).default(0).notNull(),
    /** A `ParseErrorCode`, or free text written by older versions. */
    errorCode: text('error_message'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('parse_jobs_one_active_user_idx')
      .on(table.userId)
      .where(sql`${table.status} IN ('pending', 'running')`),
    index('parse_jobs_user_created_idx').on(table.userId, table.createdAt),
    index('parse_jobs_status_created_idx').on(table.status, table.createdAt),
  ],
)

export const chatReports = pgTable(
  'chat_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tgChatId: bigint('tg_chat_id', { mode: 'number' }).notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    chatType: varchar('chat_type', { length: 20 }).$type<ChatType>().notNull(),
    totalMessages: integer('total_messages').notNull(),
    firstMessageAt: timestamp('first_message_at', { withTimezone: true }),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    analyzedAt: timestamp('analyzed_at', { withTimezone: true }).defaultNow().notNull(),
    report: jsonb('report').$type<ChatReport>().notNull(),
  },
  (table) => [
    uniqueIndex('chat_reports_user_chat_idx').on(table.userId, table.tgChatId),
    index('chat_reports_user_analyzed_idx').on(table.userId, table.analyzedAt),
  ],
)

/** Recent statistics of the user's private chats for the «Мои люди» page; one row per user. */
export const peopleOverviews = pgTable('people_overviews', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).$type<PeopleOverviewStatus>().notNull(),
  scannedChats: integer('scanned_chats').default(0).notNull(),
  totalChats: integer('total_chats').default(0).notNull(),
  contacts: jsonb('contacts').$type<ContactStatsDto[]>().default([]).notNull(),
  /** When the last complete overview finished; null until the first one does. */
  computedAt: timestamp('computed_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const refreshSessions = pgTable(
  'refresh_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    familyId: varchar('family_id', { length: 255 }).notNull(),
    tokenId: varchar('token_id', { length: 255 }).notNull().unique(),
    replacedByTokenId: varchar('replaced_by_token_id', { length: 255 }),
    rotatedAt: timestamp('rotated_at', { withTimezone: true }),
    graceUntil: timestamp('grace_until', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index('refresh_sessions_user_family_idx').on(table.userId, table.familyId),
    index('refresh_sessions_expires_at_idx').on(table.expiresAt),
  ],
)

export type UserRow = typeof users.$inferSelect
export type TelegramSessionRow = typeof telegramSessions.$inferSelect
export type ParseJobRow = typeof parseJobs.$inferSelect
export type ChatReportRow = typeof chatReports.$inferSelect
export type RefreshSessionRow = typeof refreshSessions.$inferSelect
