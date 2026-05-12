export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export type AuthErrorCode =
  | 'AUTH_UNAUTHORIZED'
  | 'AUTH_REFRESH_INVALID'
  | 'AUTH_REFRESH_REPLAYED'
  | 'TELEGRAM_REAUTH_REQUIRED'
  | 'AUTH_TEMP_TOKEN_INVALID'

export interface ApiErrorResponse {
  message: string
  code?: AuthErrorCode | string
}

export interface UserDto {
  id: string
  tgUserId: string
  username: string | null
  firstName: string | null
  telegramSessionActive?: boolean
}

export interface SendCodeBody {
  phone: string
}

export interface SendCodeResponse {
  phoneCodeHash: string
  isPasswordRequired?: false
}

export interface VerifyCodeBody {
  phone: string
  code: string
  phoneCodeHash: string
}

export interface VerifyPasswordBody {
  password: string
}

export interface AuthSuccessResponse {
  accessToken: string
  user: UserDto
}

export interface PendingPasswordResponse {
  isPasswordRequired: true
  tempToken: string
}

export interface RefreshResponse {
  accessToken: string
  user: UserDto
}

export interface StartParseBody {
  chatIds?: string[]
}

export interface StartParseResponse {
  jobId: string
}

export interface ParseDialogDto {
  id: string
  title: string
  type: 'private' | 'group' | 'channel' | 'bot' | 'unknown'
  hasAvatar?: boolean
}

export interface ParseDialogsResponse {
  dialogs: ParseDialogDto[]
  truncated: boolean
  total: number
}

export interface ParseProgressDto {
  current: number
  total: number
  chatId: string | null
  chatName: string
  status: JobStatus | 'idle'
  message?: string
  scannedMessages?: number
}

export interface ParseStatusResponse {
  jobId: string | null
  status: JobStatus | 'idle'
  progress: ParseProgressDto
}

export interface ParseHistoryItem {
  jobId: string
  chatId: string | null
  chatName: string | null
  status: JobStatus
  totalChats: number
  parsedChats: number
  totalMessages: number
  createdAt: string
  completedAt: string | null
  errorMessage?: string | null
}

export interface DeleteResponse {
  success: true
}

export interface ClearHistoryResponse extends DeleteResponse {
  deleted: number
}

export interface DeleteHistoryItemResponse extends DeleteResponse {}

export interface PagedChatsResponse {
  chats: ChatStatsDto[]
  total: number
  page: number
  limit: number
}

export interface TopItemDto {
  value: string
  count: number
}

export interface DirectionalCountDto {
  sent: number
  received: number
  total: number
}

export interface DatedActivityDto extends DirectionalCountDto {
  date: string
}

export interface MonthlyActivityDto extends DirectionalCountDto {
  month: string
}

export interface LongestGapDto {
  seconds: number
  from: string | null
  to: string | null
}

export interface MostActiveDateDto {
  date: string | null
  total: number
}

export interface ResponseStatsDto {
  medianMineSec: number | null
  medianTheirsSec: number | null
  mineSamples: number
  theirsSamples: number
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

export interface RelationshipScoreDto {
  score: number
  label: 'balanced' | 'warm' | 'cooling' | 'one_sided' | 'emerging'
  reciprocity: number | null
  responsiveness: number | null
  stability: number | null
  attentionBalance: number | null
}

export interface InsightDto {
  key: string
  title: string
  description: string
  tone: 'positive' | 'neutral' | 'warning'
}

export interface ConversationFactsDto {
  activeDays: number
  longestGap: LongestGapDto | null
  mostActiveDate: MostActiveDateDto | null
  maxStreakDays: number
  firstMessageAt: string | null
  silencePeriodsOver30Days: LongestGapDto[]
  trend: 'growing' | 'stable' | 'fading' | 'unknown'
  mostActiveMonth: string | null
  sessionStats: SessionStatsDto
  relationshipScore: RelationshipScoreDto | null
  insights: InsightDto[]
}

export interface DirectionalTopItemsDto {
  mine: TopItemDto[]
  theirs: TopItemDto[]
}

export interface DirectionalAveragesDto {
  mine: number | null
  theirs: number | null
}

export interface MessageCompositionDto {
  text: number
  media: number
  voice: number
  sticker: number
  file: number
}

export interface ActivityPointDto {
  date: string
  sent: number
  received: number
}

export interface GlobalStatsDto {
  totalChats: number
  totalMessages: number
  totalSent: number
  totalReceived: number
  totalChars: number
  topEmoji: TopItemDto[]
  topWords: TopItemDto[]
  firstEverMessage: string | null
  lastEverMessage: string | null
  mostActiveHour: number | null
  mostActiveDay: number | null
}

export interface ChatStatsDto {
  tgChatId: string
  chatName: string | null
  chatType: string | null
  totalMessages: number
  sentMessages: number
  receivedMessages: number
  totalChars: number
  totalWords: number
  textMessageCount: number
  mediaCount: number
  voiceCount: number
  stickerCount: number
  fileCount: number
  firstMessageAt: string | null
  lastMessageAt: string | null
  parsedAt: string | null
  avgResponseSec: number | null
  medianMyResponseSec: number | null
  medianTheirResponseSec: number | null
  myWordsPerMessage: number | null
  theirWordsPerMessage: number | null
  iWriteFirstPct: number | null
  topWords: TopItemDto[]
  topEmoji: TopItemDto[]
  hourlyActivity: Record<string, number>
  dailyActivity: DatedActivityDto[]
  weekdayActivity: Record<string, DirectionalCountDto>
  monthlyActivity: MonthlyActivityDto[]
  hourlyActivitySplit: Record<string, DirectionalCountDto>
  topWordsBySender: DirectionalTopItemsDto
  topEmojiBySender: DirectionalTopItemsDto
  uniqueWordsBySender: DirectionalTopItemsDto
  responseStats: ResponseStatsDto
  conversationFacts: ConversationFactsDto
  wordsPerMessage: DirectionalAveragesDto
  messageComposition: MessageCompositionDto
}

export interface ActivityResponse {
  daily: ActivityPointDto[]
}

export interface TopResponse {
  items: TopItemDto[]
}

export interface ParseProgressEvent {
  type: 'progress'
  current: number
  total: number
  chatId: string | null
  chatName: string
  status?: JobStatus
  message?: string
  scannedMessages?: number
}

export interface ParseCompletedEvent {
  type: 'completed'
  chatId?: string | null
  status?: 'completed'
  totalMessages?: number
  message?: string
}

export interface ParseFailedEvent {
  type: 'failed'
  chatId?: string | null
  status?: 'failed'
  message: string
}

export interface ParseCancelledEvent {
  type: 'cancelled'
  chatId?: string | null
  status?: 'cancelled'
  message?: string
}

export interface ParseErrorEvent {
  type: 'error'
  message: string
}

export type ParseProgressWsEvent =
  | ParseProgressEvent
  | ParseCompletedEvent
  | ParseFailedEvent
  | ParseCancelledEvent
  | ParseErrorEvent
