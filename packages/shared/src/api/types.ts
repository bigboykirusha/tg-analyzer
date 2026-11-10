import type { HabitsSummary } from '../analytics/habits'
import type { VocabularySplit } from '../analytics/vocabulary'
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
  | 'TELEGRAM_SESSION_TOO_FRESH'
  | 'TELEGRAM_SESSION_CURRENT'
  // analysis
  | 'CHAT_NOT_FOUND'
  | 'CHAT_TOO_SMALL'
  | 'LINK_NOT_FOUND'
  | 'QUIZ_UNAVAILABLE'
  | 'QUIZ_ANSWERED'
  | 'PARSE_ALREADY_RUNNING'
  | 'PARSE_ALREADY_QUEUED'
  | 'PARSE_QUEUE_FULL'
  | 'PARSE_COOLDOWN'
  | 'PARSE_DAILY_LIMIT'
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
  /** Pressed Start in our bot: «the report is ready» arrives there. */
  botNotify: boolean
  /** The bot's Start link; null when the bot is not set up. */
  botUrl: string | null
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
  botNotify?: false
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
  /** Pinned by the user in Telegram; absent in lists cached by an older version. */
  pinned?: boolean
  /** Telegram has already said this chat has fewer messages than a report needs; no «Разобрать» for it. */
  tooSmall?: boolean
}

export interface DialogsResponse {
  dialogs: DialogDto[]
  /** True when Telegram returned more dialogs than the API lists. */
  truncated: boolean
  /** True when Telegram was busy and the response comes from the short-lived cache. */
  stale: boolean
}

/** A private chat with messages in the recent window, counted by Telegram without reading the history. */
export interface RecentChatDto {
  id: string
  title: string
  hasAvatar: boolean
  lastMessageAt: string | null
  /** Messages in the window, both sides. */
  messages: number
  /** The user's own messages in the window. */
  mine: number
  /** All messages in the chat, ever: Telegram reports it with the same answer, no extra request. */
  total?: number
}

export interface RecentActivityResponse {
  /** Start of the window, ISO. */
  since: string
  days: number
  /** Private chats with at least one message in the window. */
  activeChats: number
  /** The busiest of them, most messages first. */
  chats: RecentChatDto[]
  /** True when Telegram was busy and the numbers come from the cache. */
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
  'telegram_session_expired' | 'telegram_busy' | 'chat_unavailable' | 'chat_too_small' | 'interrupted' | 'internal'

/**
 * A chat needs this many messages for a report. Below it most cards stay empty: reply speed needs five
 * replies a side, the quiz and the findings need a hundred messages, and the shares swing on a few messages.
 */
export const MIN_REPORT_MESSAGES = 100

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
  /** ISO time of the oldest message read so far: the history is read from today backwards. */
  reachedAt?: string | null
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
  /** @deprecated Structural turn-continuation ratio (1 - sessions / turns), not responsiveness. Kept for stored reports. */
  responseRate: number | null
  /** Share of sessions started by the current user, 0–100. */
  iWriteFirstPct: number | null
  /** How fast each side answers, in {@link REPLY_BUCKETS_SEC} steps; absent in older reports. */
  histogram?: { mine: number[]; theirs: number[] }
}

/**
 * Upper bounds, in seconds, of the first buckets of the reply-time histogram:
 * under a minute, under five, under half an hour, under two hours. The last
 * bucket takes everything slower.
 */
export const REPLY_BUCKETS_SEC = [60, 300, 1800, 7200] as const

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
/** What a milestone message was. Never its text: only its kind and size. */
export type MilestoneKind = keyof MessageCompositionDto | 'round'

export interface MilestoneDto {
  index: number
  at: string
  mine: boolean
  senderId: string | null
  /** The Telegram message id, to open it in Telegram. Absent in older reports. */
  messageId?: string
  kind?: MilestoneKind
  /** Words in a text message. */
  words?: number
  /** A sticker's emoji. */
  emoji?: string | null
  /** A voice message or video note, in seconds. */
  durationSec?: number | null
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

export type InsightId = 'double_texts' | 'laughs' | 'long_silence' | 'busiest_day' | 'reply_rate'

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

export interface GroupReportDto {
  participants: GroupParticipantDto[]
  topPairs: GroupPairDto[]
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
  /** @deprecated Legacy concentration bucket; does not predict future availability. */
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
    /** 168 buckets, index = weekday * 24 + local hour (weekday 0 = Sunday); absent in older reports. */
    heatmap?: number[]
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
  /** Questions for the guessing game; empty for groups and for chats with too little to ask about. */
  quiz: QuizQuestionDto[]
  /** «Who does it more» lines of a private chat, with the «поровну» list; empty for groups. */
  habitRows: HabitsSummary
  /** The words as the report shows them, and the version that may leave the owner's screen. */
  words: DerivedWords
  /** Favourite emoji, reaction and sticker of each side. */
  favourites: DerivedFavourites
}

/**
 * Whether obscene words are in the word lists. `hidden` is the default everywhere; `shown` is the
 * owner's own full report only.
 */
export type ProfanityMode = 'hidden' | 'shown'

export interface DerivedGroupWords {
  shared: TopItemDto[]
  unique: TopItemDto[]
  /** By participant id. */
  members: Record<string, { topWords: TopItemDto[]; topicSignature: TopItemDto[] }>
}

/** The words of a report with the thin findings left out; see `deriveWords`. */
export interface DerivedWordsView {
  /** The most written word, when it has the weight to be a finding; null otherwise (no card). */
  wordOfChat: TopItemDto | null
  topWords: TopItemDto[]
  /** What you share, and what only you / only the other side say (at most 5 per side). */
  vocabulary: VocabularySplit
  group: DerivedGroupWords | null
}

export interface DerivedWords {
  profanity: ProfanityMode
  /** The report holds obscene words, so a «show everything» switch has something to show. */
  hasProfanity: boolean
  /** What the report shows now: obscene words hidden unless the owner asked for them. */
  view: DerivedWordsView
  /** Always without obscene words: «Итоги», the link and previews read this one, never `view`. */
  clean: DerivedWordsView
}

export interface FavouriteStickerDto {
  id: string
  emoji: string | null
  count: number
}

export interface DerivedFavourites {
  /** The chat's emoji, only the ones used often enough. */
  topEmoji: TopItemDto[]
  emoji: { mine: TopItemDto | null; theirs: TopItemDto | null }
  reaction: { mine: TopItemDto | null; theirs: TopItemDto | null }
  sticker: { mine: FavouriteStickerDto | null; theirs: FavouriteStickerDto | null }
}

export type QuizQuestionId =
  | 'starts'
  | 'fastest'
  | 'talker'
  | 'laughs'
  | 'questions'
  | 'voice'
  | 'stickers'
  | 'essays'
  | 'lastWord'
  | 'doubleTexts'

/** How the two numbers of a question are written out. */
export type QuizUnit = 'count' | 'percent' | 'seconds' | 'words'

/** One «who more?» question of a private chat. The values are the answer shown afterwards. */
export interface QuizQuestionDto {
  id: QuizQuestionId
  unit: QuizUnit
  mine: number
  theirs: number
  /** Who the answer is. */
  answer: 'mine' | 'theirs'
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

/** A link that opens part of a report without signing in: the report itself or the quiz. */
export type ShareLinkKind = 'report' | 'quiz'

/** What a report link shows besides the always-shown numbers. */
export interface ShareReportSettings {
  /** The other side's name; off by default — the page then says «Собеседник». */
  showName: boolean
  /** The «О чём» part: words and emoji. */
  words: boolean
  /** Stickers and reactions. */
  stickers: boolean
}

/** Days a link stays open; null keeps it open until it is switched off. */
export type ShareLinkDays = 7 | 30 | null

export interface CreateShareLinkBody {
  kind: ShareLinkKind
  days: ShareLinkDays
  /** Report links only. */
  settings?: ShareReportSettings
}

/** The guest's answers, as the owner sees them; only when the guest agreed to share them. */
export interface QuizResultDto {
  answeredAt: string
  /** Null when the guest chose not to show the score. */
  score: number | null
  total: number
  /** Per question, in order: whether the guest was right. Null without consent. */
  correct: boolean[] | null
}

export interface ShareLinkDto {
  kind: ShareLinkKind
  token: string
  createdAt: string
  /** Null: open until switched off. */
  expiresAt: string | null
  views: number
  settings: ShareReportSettings | null
  /** Quiz links: the questions asked, in the owner's terms. */
  questions: QuizQuestionDto[] | null
  result: QuizResultDto | null
}

export interface ShareLinksResponse {
  links: ShareLinkDto[]
  /** Whether this report has enough clear answers for a quiz. */
  quizAvailable: boolean
}

/** One quiz question as the guest sees it: «author» is the one who sent the link, «guest» is «you». */
export interface PublicQuizQuestionDto {
  id: QuizQuestionId
  unit: QuizUnit
  author: number
  guest: number
  answer: 'author' | 'guest'
}

export interface PublicQuizDto {
  kind: 'quiz'
  /** The author's first name from Telegram. */
  author: string
  /** The chat's colour family (1–7, `telegramHueIndex`): the link hides the chat id, not its colour. */
  hue: number
  expiresAt: string | null
  questions: PublicQuizQuestionDto[]
  /** Set once the guest has answered. */
  answered: { score: number; total: number; picks: ('author' | 'guest')[]; answeredAt: string } | null
}

export interface PublicReportDto {
  kind: 'report'
  author: string
  /** The chat's colour family (1–7), as in the owner's report. */
  hue: number
  expiresAt: string | null
  settings: ShareReportSettings
  data: ReportDto
}

export type PublicShareDto = PublicQuizDto | PublicReportDto

export interface AnswerQuizBody {
  picks: ('author' | 'guest')[]
  /** Let the author see the score and the answers. */
  share: boolean
}

/** One link of the user's, with the chat it belongs to: what the home summary needs. */
export interface UserShareLinkDto {
  chatId: string
  title: string
  kind: ShareLinkKind
  expiresAt: string | null
  result: QuizResultDto | null
}

export interface UserShareLinksResponse {
  links: UserShareLinkDto[]
}

/** One authorization of the account, as the Telegram app lists it under Devices. No IP address is kept or sent. */
export interface TelegramSessionDto {
  /** Telegram's own handle for the authorization; changes after a re-login. */
  hash: string
  device: string
  platform: string
  /** Application name and version, e.g. «Telegram iOS 11.2». */
  app: string
  country: string
  /** ISO time of the last activity. */
  activeAt: string
  /** This service's own authorization: it cannot be ended here, «Sign out» does it. */
  current: boolean
  /** An official Telegram application. */
  official: boolean
}

export interface TelegramSessionsResponse {
  sessions: TelegramSessionDto[]
}
