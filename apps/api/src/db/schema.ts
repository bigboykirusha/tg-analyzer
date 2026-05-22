import {
  bigint,
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tgUserId: bigint('tg_user_id', { mode: 'number' }).notNull().unique(),
  tgPhone: varchar('tg_phone', { length: 20 }),
  username: varchar('username', { length: 255 }),
  firstName: varchar('first_name', { length: 255 }),
  timezone: varchar('timezone', { length: 64 }).default('UTC').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastLogin: timestamp('last_login', { withTimezone: true }),
})

export const telegramSessions = pgTable('telegram_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionString: text('session_string').notNull(),
  sessionIv: text('session_iv').notNull(),
  authTag: text('auth_tag').notNull(),
  dcId: integer('dc_id'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
})

export const parseJobs = pgTable('parse_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bullJobId: varchar('bull_job_id', { length: 255 }),
  chatId: bigint('chat_id', { mode: 'number' }),
  chatName: varchar('chat_name', { length: 500 }),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  totalChats: integer('total_chats').default(0).notNull(),
  parsedChats: integer('parsed_chats').default(0).notNull(),
  totalMessages: bigint('total_messages', { mode: 'number' }).default(0).notNull(),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const chatStats = pgTable('chat_stats', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tgChatId: bigint('tg_chat_id', { mode: 'number' }).notNull(),
  chatName: varchar('chat_name', { length: 500 }),
  chatType: varchar('chat_type', { length: 20 }),
  isMe: boolean('is_me').default(false).notNull(),
  totalMessages: integer('total_messages').default(0).notNull(),
  sentMessages: integer('sent_messages').default(0).notNull(),
  receivedMessages: integer('received_messages').default(0).notNull(),
  totalChars: bigint('total_chars', { mode: 'number' }).default(0).notNull(),
  totalWords: bigint('total_words', { mode: 'number' }).default(0).notNull(),
  textMessageCount: integer('text_message_count').default(0).notNull(),
  mediaCount: integer('media_count').default(0).notNull(),
  voiceCount: integer('voice_count').default(0).notNull(),
  stickerCount: integer('sticker_count').default(0).notNull(),
  fileCount: integer('file_count').default(0).notNull(),
  firstMessageAt: timestamp('first_message_at', { withTimezone: true }),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  averageMyResponseSec: integer('average_my_response_sec'),
  medianMyResponseSec: integer('median_my_response_sec'),
  medianTheirResponseSec: integer('median_their_response_sec'),
  iWriteFirstPct: integer('i_write_first_pct'),
  responseRate: numeric('response_rate', { precision: 5, scale: 2 }),
  parsedAt: timestamp('parsed_at', { withTimezone: true }).defaultNow(),
  myWordsPerMessage: numeric('my_words_per_message', { precision: 6, scale: 2 }),
  theirWordsPerMessage: numeric('their_words_per_message', { precision: 6, scale: 2 }),
  topWords: jsonb('top_words').$type<Array<{ value: string; count: number }>>().default([]).notNull(),
  topEmoji: jsonb('top_emoji').$type<Array<{ value: string; count: number }>>().default([]).notNull(),
  hourlyActivity: jsonb('hourly_activity').$type<Record<string, number>>().default({}).notNull(),
  dailyActivity: jsonb('daily_activity_json').$type<Array<{ date: string; sent: number; received: number; total: number }>>().default([]).notNull(),
  weekdayActivity: jsonb('weekday_activity').$type<Record<string, { sent: number; received: number; total: number }>>().default({}).notNull(),
  monthlyActivity: jsonb('monthly_activity').$type<Array<{ month: string; sent: number; received: number; total: number }>>().default([]).notNull(),
  hourlyActivitySplit: jsonb('hourly_activity_split').$type<Record<string, { sent: number; received: number; total: number }>>().default({}).notNull(),
  topWordsBySender: jsonb('top_words_by_sender').$type<{ mine: Array<{ value: string; count: number }>; theirs: Array<{ value: string; count: number }> }>().default({ mine: [], theirs: [] }).notNull(),
  topEmojiBySender: jsonb('top_emoji_by_sender').$type<{ mine: Array<{ value: string; count: number }>; theirs: Array<{ value: string; count: number }> }>().default({ mine: [], theirs: [] }).notNull(),
  uniqueWordsBySender: jsonb('unique_words_by_sender').$type<{ mine: Array<{ value: string; count: number }>; theirs: Array<{ value: string; count: number }> }>().default({ mine: [], theirs: [] }).notNull(),
  responseStats: jsonb('response_stats').$type<{
    medianMineSec: number | null
    medianTheirsSec: number | null
    mineSamples: number
    theirsSamples: number
    mineP25Sec: number | null
    mineP75Sec: number | null
    mineP95Sec: number | null
    theirsP25Sec: number | null
    theirsP75Sec: number | null
    theirsP95Sec: number | null
  }>().default({
    medianMineSec: null,
    medianTheirsSec: null,
    mineSamples: 0,
    theirsSamples: 0,
    mineP25Sec: null,
    mineP75Sec: null,
    mineP95Sec: null,
    theirsP25Sec: null,
    theirsP75Sec: null,
    theirsP95Sec: null,
  }).notNull(),
  messageComposition: jsonb('message_composition').$type<{
    text: number
    media: number
    voice: number
    sticker: number
    file: number
  }>().default({
    text: 0,
    media: 0,
    voice: 0,
    sticker: 0,
    file: 0,
  }).notNull(),
  activityDistribution: jsonb('activity_distribution').$type<{
    night: { sent: number; received: number; total: number }
    morning: { sent: number; received: number; total: number }
    afternoon: { sent: number; received: number; total: number }
    evening: { sent: number; received: number; total: number }
  }>().default({
    night: { sent: 0, received: 0, total: 0 },
    morning: { sent: 0, received: 0, total: 0 },
    afternoon: { sent: 0, received: 0, total: 0 },
    evening: { sent: 0, received: 0, total: 0 },
  }).notNull(),
  compositionStats: jsonb('composition_stats').$type<{
    textSharePct: number | null
    mediaSharePct: number | null
    voiceSharePct: number | null
    stickerSharePct: number | null
    fileSharePct: number | null
    avgCharsPerTextMessage: number | null
  }>().default({
    textSharePct: null,
    mediaSharePct: null,
    voiceSharePct: null,
    stickerSharePct: null,
    fileSharePct: null,
    avgCharsPerTextMessage: null,
  }).notNull(),
  availabilityProfile: jsonb('availability_profile').$type<{
    activeHours: number
    activeHoursPct: number
    concentrationIndex: number | null
    predictability: 'low' | 'medium' | 'high'
    peakWindow: string | null
    secondaryWindow: string | null
  }>().default({
    activeHours: 0,
    activeHoursPct: 0,
    concentrationIndex: null,
    predictability: 'low',
    peakWindow: null,
    secondaryWindow: null,
  }).notNull(),
  healthScore: jsonb('health_score').$type<{
    score: number
    label: 'strong' | 'steady' | 'fragile' | 'imbalanced'
    responseRate: number | null
    fragmentation: number | null
    initiativeBalance: number | null
    longTermStability: number | null
  }>(),
  conversationFacts: jsonb('conversation_facts').$type<{
    activeDays: number
    longestGap: { seconds: number; from: string | null; to: string | null } | null
    mostActiveDate: { date: string | null; total: number } | null
    maxStreakDays: number
    maxStreak: { days: number; startDate: string | null; endDate: string | null } | null
    firstMessageAt: string | null
    silencePeriodsOver30Days: Array<{ seconds: number; from: string | null; to: string | null }>
    trend: 'growing' | 'stable' | 'fading' | 'unknown'
    mostActiveMonth: string | null
    sessionStats: {
      totalSessions: number
      averageSessionMessages: number
      averageSessionDurationSec: number | null
      longestSessionMessages: number
      longestSessionDurationSec: number | null
      sessionsPerActiveWeek: number
      nightSessionsPct: number | null
      highlights: Array<{
        startedAt: string
        endedAt: string
        durationSec: number
        totalMessages: number
        sentMessages: number
        receivedMessages: number
      }>
    }
    relationshipScore: {
      score: number
      label: 'balanced' | 'warm' | 'cooling' | 'one_sided' | 'emerging'
      reciprocity: number | null
      responsiveness: number | null
      stability: number | null
      attentionBalance: number | null
    } | null
    insights: Array<{
      key: string
      title: string
      description: string
      tone: 'positive' | 'neutral' | 'warning'
    }>
  }>().default({
    activeDays: 0,
    longestGap: null,
    mostActiveDate: null,
    maxStreakDays: 0,
    maxStreak: null,
    firstMessageAt: null,
    silencePeriodsOver30Days: [],
    trend: 'unknown',
    mostActiveMonth: null,
    sessionStats: {
      totalSessions: 0,
      averageSessionMessages: 0,
      averageSessionDurationSec: null,
      longestSessionMessages: 0,
      longestSessionDurationSec: null,
      sessionsPerActiveWeek: 0,
      nightSessionsPct: null,
      highlights: [],
    },
    relationshipScore: null,
    insights: [],
  }).notNull(),
  wordsPerMessage: jsonb('words_per_message').$type<{ mine: number | null; theirs: number | null }>().default({ mine: null, theirs: null }).notNull(),
  groupParticipants: jsonb('group_participants').$type<Array<{
    id: string
    name: string
    isSelf: boolean
    role: 'anchor' | 'contributor' | 'newcomer' | 'inactive' | 'reactor' | 'lurker' | 'ghost' | 'catalyst'
    messageCount: number
    messageShare: number
    wordCount: number
    avgWordsPerMessage: number | null
    mediaCount: number
    mediaShare: number
    firstSeen: string | null
    lastSeen: string | null
    activeDays: number
    consistencyScore: number
    starterCount: number
    starterShare: number
    replyCount: number
    repliesReceived: number
    magnetScore: number | null
    replyRatio: number | null
    topWords: Array<{ value: string; count: number }>
    topEmoji: Array<{ value: string; count: number }>
    topicSignature: Array<{ value: string; count: number }>
  }>>().default([]).notNull(),
  groupTopPairs: jsonb('group_top_pairs').$type<Array<{
    leftParticipantId: string
    leftParticipantName: string
    rightParticipantId: string
    rightParticipantName: string
    symmetricScore: number
    directReplies: number
    impliedReplies: number
  }>>().default([]).notNull(),
  groupHealth: jsonb('group_health').$type<{
    score: number
    giniCoefficient: number
    lurkerRatio: number
    retentionRate: number
    responseCoverage: number
    consistency: number
    momentum: 'growing' | 'stable' | 'shrinking'
    activeMembers: number
    activeMembersLast30Days: number
    churnedMembers: number
    peakSimultaneity: number
  }>(),
  sharedVocabulary: jsonb('shared_vocabulary').$type<Array<{ value: string; count: number }>>().default([]).notNull(),
  uniqueGroupWords: jsonb('unique_group_words').$type<Array<{ value: string; count: number }>>().default([]).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  chatStatsUnique: uniqueIndex('chat_stats_user_chat_idx').on(table.userId, table.tgChatId),
}))

export const dailyActivity = pgTable('daily_activity', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  sent: integer('sent').default(0).notNull(),
  received: integer('received').default(0).notNull(),
}, (table) => ({
  dailyUnique: uniqueIndex('daily_activity_user_date_idx').on(table.userId, table.date),
}))

export const globalStats = pgTable('global_stats', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  totalChats: integer('total_chats').default(0).notNull(),
  totalMessages: bigint('total_messages', { mode: 'number' }).default(0).notNull(),
  totalSent: bigint('total_sent', { mode: 'number' }).default(0).notNull(),
  totalReceived: bigint('total_received', { mode: 'number' }).default(0).notNull(),
  totalChars: bigint('total_chars', { mode: 'number' }).default(0).notNull(),
  topEmoji: jsonb('top_emoji').$type<Array<{ value: string; count: number }>>().default([]).notNull(),
  topWords: jsonb('top_words').$type<Array<{ value: string; count: number }>>().default([]).notNull(),
  firstEverMsg: timestamp('first_ever_msg', { withTimezone: true }),
  lastEverMsg: timestamp('last_ever_msg', { withTimezone: true }),
  mostActiveHour: integer('most_active_hour'),
  mostActiveDay: integer('most_active_day'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const refreshSessions = pgTable('refresh_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  familyId: varchar('family_id', { length: 255 }).notNull(),
  tokenId: varchar('token_id', { length: 255 }).notNull().unique(),
  replacedByTokenId: varchar('replaced_by_token_id', { length: 255 }),
  rotatedAt: timestamp('rotated_at', { withTimezone: true }),
  graceUntil: timestamp('grace_until', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
