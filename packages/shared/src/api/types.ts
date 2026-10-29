/**
 * Data transfer objects shared by the API and the web client.
 * Everything here is serialisable JSON: dates are ISO strings, ids are strings.
 */

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type ApiErrorCode =
  // generic
  | 'INVALID_REQUEST'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'ORIGIN_FORBIDDEN'
  | 'INTERNAL_ERROR'
  // app session
  | 'AUTH_UNAUTHORIZED'
  | 'AUTH_REFRESH_INVALID'
  | 'AUTH_REFRESH_REPLAYED'
  // telegram login
  | 'LOGIN_PHONE_INVALID'
  | 'LOGIN_PHONE_BANNED'
  | 'LOGIN_CODE_INVALID'
  | 'LOGIN_CODE_EXPIRED'
  | 'LOGIN_PASSWORD_INVALID'
  | 'LOGIN_SESSION_EXPIRED'
  // telegram runtime
  | 'TELEGRAM_FLOOD_WAIT'
  | 'TELEGRAM_REAUTH_REQUIRED'
  | 'TELEGRAM_BUSY'
  | 'TELEGRAM_UNAVAILABLE'
  // analysis
  | 'CHAT_NOT_FOUND'
  | 'PARSE_ALREADY_RUNNING'
  | 'PARSE_ALREADY_QUEUED'
  | 'PARSE_QUEUE_FULL'
  | 'PARSE_COOLDOWN'
  | 'PARSE_NOT_ACTIVE'
  | 'PARSE_JOB_ACTIVE'
  | 'QUEUE_UNAVAILABLE'

export interface ApiErrorResponse {
  code: ApiErrorCode
  message: string
  requestId?: string
  /** Seconds until the request may be retried (rate limits, flood waits, cooldowns). */
  retryAfter?: number
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface UserDto {
  id: string
  tgUserId: string
  username: string | null
  firstName: string | null
  timezone: string
  /** Sign out of Telegram after every analysis. */
  disconnectAfterAnalysis: boolean
  telegramSessionActive: boolean
}

export interface SendCodeBody {
  phone: string
}

/**
 * Where Telegram delivered the login code. Telegram picks the channel itself:
 * usually the app, but for third-party clients it may switch to SMS, a call,
 * the login email, or demand that a login email is set up first.
 */
export type CodeDeliveryType = 'app' | 'sms' | 'call' | 'missed_call' | 'email' | 'email_setup_required' | 'unsupported'

export interface CodeDeliveryDto {
  type: CodeDeliveryType
  /** Masked login email, e.g. `a***@gmail.com`, when `type` is `email`. */
  emailPattern: string | null
  /** Number of digits when Telegram reports it. */
  length: number | null
  /** Channel of the next code after a resend, when Telegram offers one. */
  nextType: CodeDeliveryType | null
  /** Seconds before a resend is allowed, when Telegram reports it. */
  timeoutSec: number | null
}

export interface SendCodeResponse {
  phoneCodeHash: string
  delivery: CodeDeliveryDto
}

export interface ResendCodeBody {
  phone: string
  phoneCodeHash: string
}

export interface VerifyCodeBody {
  phone: string
  code: string
  phoneCodeHash: string
}

export interface VerifyPasswordBody {
  /** Token returned by verify-code when two-step verification is enabled. */
  tempToken: string
  password: string
}

export interface AuthSuccessResponse {
  accessToken: string
  user: UserDto
}

export interface PasswordRequiredResponse {
  passwordRequired: true
  tempToken: string
  passwordHint: string | null
}

export type VerifyCodeResponse = AuthSuccessResponse | PasswordRequiredResponse

export interface UpdateProfileBody {
  timezone?: string
  disconnectAfterAnalysis?: boolean
}

export interface UserResponse {
  user: UserDto
}

export interface WsTicketResponse {
  ticket: string
}

export interface SuccessResponse {
  success: true
}

// ---------------------------------------------------------------------------
// Telegram dialogs
// ---------------------------------------------------------------------------

export type ChatType = 'private' | 'group' | 'channel' | 'bot' | 'unknown'

/** Chat types that can be analysed. Channels and bots are not conversations. */
export const ANALYZABLE_CHAT_TYPES = ['private', 'group'] as const satisfies readonly ChatType[]
export type AnalyzableChatType = (typeof ANALYZABLE_CHAT_TYPES)[number]

export interface DialogDto {
  id: string
  title: string
  type: ChatType
  hasAvatar: boolean
  /** ISO time of the newest message; null when unknown (or cached by an older version). */
  lastMessageAt: string | null
}

export interface DialogsResponse {
  dialogs: DialogDto[]
  /** True when Telegram returned more dialogs than the API lists. */
  truncated: boolean
  /** True when Telegram was busy and the response comes from the short-lived cache. */
  stale: boolean
}

export interface AvatarsBody {
  chatIds: string[]
}

export interface AvatarsResponse {
  /** `data:` URLs keyed by chat id; null when the chat has no photo. */
  avatars: Record<string, string | null>
}

// ---------------------------------------------------------------------------
// Analysis jobs
// ---------------------------------------------------------------------------

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export type ParsePhase = 'queued' | 'connecting' | 'scanning' | 'waiting' | 'saving' | 'retrying'

/** Machine-readable failure reason; the UI localises it. */
export type ParseErrorCode =
  'telegram_session_expired' | 'telegram_busy' | 'chat_unavailable' | 'interrupted' | 'internal'

/** An analysis waiting for its turn; one chat is analysed at a time. */
export interface QueuedAnalysisDto {
  jobId: string
  chatId: string
  chatTitle: string | null
}

export interface CancelParseBody {
  /** A queued or running job; without it the running analysis is cancelled. */
  jobId?: string
}

export interface ParseProgressDto {
  jobId: string | null
  status: JobStatus | 'idle'
  phase: ParsePhase | null
  chatId: string | null
  chatTitle: string | null
  scannedMessages: number
  /** Total messages in the chat as reported by Telegram, when known. */
  totalMessages: number | null
  /** Unix epoch milliseconds. */
  startedAt: number | null
  /** Seconds Telegram asked us to wait (phase `waiting`). */
  waitSeconds: number | null
  error: ParseErrorCode | null
  /** Analyses waiting after this one, oldest first. Only in the status response. */
  queued?: QueuedAnalysisDto[]
}

export interface StartParseBody {
  chatId: string
}

export interface StartParseResponse {
  jobId: string
}

export interface ParseJobDto {
  jobId: string
  /** Null for legacy "all chats" jobs. */
  chatId: string | null
  chatTitle: string | null
  status: JobStatus
  totalMessages: number
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  error: ParseErrorCode | null
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

export interface ClearHistoryResponse extends SuccessResponse {
  deleted: number
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export interface TopItemDto {
  value: string
  count: number
}

export interface DirectionalCountDto {
  sent: number
  received: number
  total: number
}

export interface DirectionalTopItemsDto {
  mine: TopItemDto[]
  theirs: TopItemDto[]
}

export interface DatedActivityDto extends DirectionalCountDto {
  /** Local calendar day, `YYYY-MM-DD`. */
  date: string
}

export interface MonthlyActivityDto extends DirectionalCountDto {
  /** Local calendar month, `YYYY-MM`. */
  month: string
}

export interface GapDto {
  seconds: number
  from: string | null
  to: string | null
  /** Whether the user sent the message that ended the silence; absent in older reports. */
  brokenByMe?: boolean
}

export interface StreakDto {
  days: number
  startDate: string | null
  endDate: string | null
}

export interface MessageCompositionDto {
  text: number
  media: number
  voice: number
  sticker: number
  file: number
}

export interface ResponseStatsDto {
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
  /** Share of conversational turns that received a reply within the same session, 0–100. */
  responseRate: number | null
  /** Share of sessions started by the current user, 0–100. */
  iWriteFirstPct: number | null
}

export interface SessionHighlightDto {
  startedAt: string
  endedAt: string
  durationSec: number
  totalMessages: number
  sentMessages: number
  receivedMessages: number
}

export interface SessionStatsDto {
  totalSessions: number
  averageSessionMessages: number
  averageSessionDurationSec: number | null
  longestSessionMessages: number
  longestSessionDurationSec: number | null
  sessionsPerActiveWeek: number
  nightSessionsPct: number | null
  highlights: SessionHighlightDto[]
}

export interface SideCountDto {
  mine: number
  theirs: number
}

/** Habits of a one-to-one chat, counted per side. */
export interface ConversationHabitsDto {
  /** Writing again after 30+ minutes without an answer. */
  doubleTexts: { mine: number; theirs: number }
  /** Share of conversations in which you sent the last message, 0–100. */
  lastWordMinePct: number | null
  /** Messages with a question mark. */
  questions: { mine: number; theirs: number }
  /** Messages that laugh: «ахах», «хаха», «lol», 😂, 🤣. */
  laughs: { mine: number; theirs: number }
  /**
   * Questions (a run of them counts once) after which the other side did not
   * write anything in the same conversation. Absent in older reports.
   */
  unansweredQuestions?: SideCountDto
  /** Question runs, the base of {@link unansweredQuestions}. */
  questionTurns?: SideCountDto
}

/** Voice messages or video notes («кружочки») of one chat. */
export interface RecordingStatsDto {
  count: SideCountDto
  seconds: SideCountDto
  /** The longest one; `mine` tells who recorded it. */
  longest: { seconds: number; mine: boolean; at: string; senderId: string | null } | null
}

export interface VoiceStatsDto {
  voice: RecordingStatsDto
  round: RecordingStatsDto
}

export interface ReactionStatsDto {
  /** Reactions each side put on messages of the chat. */
  given: SideCountDto
  /** Reactions on messages of each side. */
  received: SideCountDto
  /** Messages of each side with at least one reaction. */
  reactedMessages: SideCountDto
  /** Emoji reactions by who put them; custom emoji count under «custom». */
  topBySender: DirectionalTopItemsDto
  top: TopItemDto[]
}

export interface StickerDto {
  /** Telegram document id, stable across chats. */
  id: string
  /** The emoji the sticker stands for. */
  emoji: string | null
  mine: number
  theirs: number
  /** A small preview as a data URL; null when Telegram did not give one. */
  thumb: string | null
}

export interface StickerStatsDto {
  count: SideCountDto
  /** Different stickers and sticker packs used. */
  distinct: number
  packs: number
  top: StickerDto[]
}

/** The n-th message of the chat. */
export interface MilestoneDto {
  index: number
  at: string
  mine: boolean
  senderId: string | null
}

/**
 * Daily rituals. A morning counts when the first message after 5:00 came
 * before noon; an evening when messages ran past 21:00 (until 5:00).
 */
export interface RitualsDto {
  mornings: number
  morningFirst: SideCountDto
  evenings: number
  nightLast: SideCountDto
  /** Messages with «доброе утро», «утречко», «good morning»… */
  goodMorning: SideCountDto
  /** Messages with «спокойной ночи», «споки», «сладких снов», «иду спать»… */
  goodNight: SideCountDto
}

export type InsightId =
  | 'initiative'
  | 'reply_speed'
  | 'double_texts'
  | 'last_word'
  | 'questions'
  | 'laughs'
  | 'night_talks'
  | 'long_silence'
  | 'streak'
  | 'trend'

/**
 * One notable pattern of a chat, ready to be put into words by the client.
 * `side` names who the sentence is about; `strength` (0–1) ranks insights.
 */
export interface InsightDto {
  id: InsightId
  side: 'mine' | 'theirs' | 'both'
  strength: number
  values: Record<string, number | string>
}

export type Trend = 'growing' | 'stable' | 'fading' | 'unknown'

export interface ConversationFactsDto {
  activeDays: number
  longestGap: GapDto | null
  mostActiveDate: { date: string; total: number } | null
  maxStreak: StreakDto
  silencesOver30Days: GapDto[]
  trend: Trend
  mostActiveMonth: string | null
}

export interface RelationshipScoreDto {
  score: number
  label: 'balanced' | 'warm' | 'cooling' | 'one_sided' | 'emerging'
  reciprocity: number | null
  responsiveness: number | null
  stability: number | null
  attentionBalance: number | null
}

export interface HealthScoreDto {
  score: number
  label: 'strong' | 'steady' | 'fragile' | 'imbalanced'
  responseRate: number | null
  /** Share of sessions beyond the first one per active day, 0–100. Lower is better. */
  fragmentation: number | null
  initiativeBalance: number | null
  longTermStability: number | null
}

export type GroupMemberRole = 'anchor' | 'contributor' | 'newcomer' | 'inactive'

export interface GroupParticipantDto {
  id: string
  name: string
  isSelf: boolean
  role: GroupMemberRole
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
  topWords: TopItemDto[]
  topEmoji: TopItemDto[]
  topicSignature: TopItemDto[]
  /** Absent in older reports. */
  voiceSeconds?: number
  roundSeconds?: number
  stickerCount?: number
  reactionsReceived?: number
  /** Mornings this member opened and evenings they closed. */
  morningFirst?: number
  nightLast?: number
  greetings?: number
}

export interface GroupPairDto {
  leftParticipantId: string
  leftParticipantName: string
  rightParticipantId: string
  rightParticipantName: string
  symmetricScore: number
  directReplies: number
  impliedReplies: number
}

export interface GroupHealthDto {
  giniCoefficient: number
  lurkerRatio: number
  retentionRate: number | null
  responseCoverage: number
  consistency: number
  momentum: 'growing' | 'stable' | 'shrinking' | 'unknown'
  activeMembers: number
  activeMembersLast30Days: number
  churnedMembers: number
  peakSimultaneity: number
}

/**
 * Who answers whom among the most active members. `cells[row][column]` counts
 * the replies of `participantIds[row]` to `participantIds[column]`: explicit
 * replies plus messages written within minutes after the other person.
 */
export interface GroupReplyMapDto {
  participantIds: string[]
  cells: number[][]
}

export interface GroupReportDto {
  participants: GroupParticipantDto[]
  topPairs: GroupPairDto[]
  /** Null for reports made before the map existed. */
  replyMap: GroupReplyMapDto | null
  health: GroupHealthDto | null
  sharedVocabulary: TopItemDto[]
  uniqueGroupWords: TopItemDto[]
}

export interface ActivityDistributionDto {
  night: DirectionalCountDto
  morning: DirectionalCountDto
  afternoon: DirectionalCountDto
  evening: DirectionalCountDto
}

export interface CompositionStatsDto {
  textSharePct: number | null
  mediaSharePct: number | null
  voiceSharePct: number | null
  stickerSharePct: number | null
  fileSharePct: number | null
  avgCharsPerTextMessage: number | null
}

export interface AvailabilityProfileDto {
  activeHours: number
  activeHoursPct: number
  concentrationIndex: number | null
  predictability: 'low' | 'medium' | 'high'
  peakWindow: string | null
  secondaryWindow: string | null
}

export const CHAT_REPORT_VERSION = 2

/**
 * The persisted analysis document of one chat. It holds only aggregated
 * counters: no message text is ever stored.
 */
export interface ChatReport {
  version: typeof CHAT_REPORT_VERSION
  /** IANA time zone used to bucket hours, days and months. */
  timeZone: string
  totals: {
    messages: number
    sent: number
    received: number
    chars: number
    words: number
    textMessages: number
  }
  composition: MessageCompositionDto
  period: {
    firstMessageAt: string | null
    lastMessageAt: string | null
  }
  activity: {
    /** 24 buckets, index = local hour. */
    hourly: DirectionalCountDto[]
    /** 7 buckets, index = local weekday (0 = Sunday). */
    weekday: DirectionalCountDto[]
    daily: DatedActivityDto[]
    monthly: MonthlyActivityDto[]
  }
  vocabulary: {
    topWords: TopItemDto[]
    topWordsBySender: DirectionalTopItemsDto
    uniqueWordsBySender: DirectionalTopItemsDto
    topEmoji: TopItemDto[]
    topEmojiBySender: DirectionalTopItemsDto
    wordsPerMessage: { mine: number | null; theirs: number | null }
  }
  responses: ResponseStatsDto
  facts: ConversationFactsDto
  sessions: SessionStatsDto
  relationship: RelationshipScoreDto | null
  health: HealthScoreDto | null
  /** Private chats only; null for groups and for reports made before habits were counted. */
  habits: ConversationHabitsDto | null
  group: GroupReportDto | null
  /** Null in reports made before these were counted: the chat needs a new analysis. */
  voice: VoiceStatsDto | null
  reactions: ReactionStatsDto | null
  stickers: StickerStatsDto | null
  milestones: MilestoneDto[] | null
  rituals: RitualsDto | null
}

/** Metrics that are cheap to recompute from a report and therefore not persisted. */
export interface DerivedReportMetrics {
  activityDistribution: ActivityDistributionDto
  compositionStats: CompositionStatsDto
  availabilityProfile: AvailabilityProfileDto
  /** Strongest patterns first; empty for groups. */
  insights: InsightDto[]
}

/** Headline numbers of one chat, for overviews that compare chats. */
export interface ReportHeadlineDto {
  /** Share of messages you sent, 0–100. */
  sentSharePct: number | null
  /** Share of conversations you started, 0–100. */
  iWriteFirstPct: number | null
  medianMineSec: number | null
  medianTheirsSec: number | null
}

export interface ReportSummaryDto {
  chatId: string
  title: string
  type: ChatType
  totalMessages: number
  firstMessageAt: string | null
  lastMessageAt: string | null
  analyzedAt: string
  /** Weekly sent/received counts for up to the last 26 weeks of the chat, oldest first. */
  pulse: { sent: number; received: number }[]
  headline: ReportHeadlineDto
}

export interface ReportsResponse {
  reports: ReportSummaryDto[]
}

/** The headline numbers of a report, kept when the chat is analysed again. */
export interface ReportSnapshotDto {
  analyzedAt: string
  messages: number
  sent: number
  received: number
  medianMineSec: number | null
  medianTheirsSec: number | null
  iWriteFirstPct: number | null
}

export interface ReportDto {
  summary: ReportSummaryDto
  report: ChatReport
  derived: DerivedReportMetrics
  /** The previous analysis of this chat, for «what changed»; null for the first one. */
  previous: ReportSnapshotDto | null
}
