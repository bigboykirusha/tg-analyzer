export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export type AuthErrorCode =
  | 'AUTH_UNAUTHORIZED'
  | 'AUTH_REFRESH_INVALID'
  | 'AUTH_REFRESH_REPLAYED'
  | 'TELEGRAM_REAUTH_REQUIRED'
  | 'AUTH_TEMP_TOKEN_INVALID'

export interface ApiErrorResponse {
  requestId?: string
  message: string
  code: AuthErrorCode | string
}

export interface UserDto {
  id: string
  tgUserId: string
  username: string | null
  firstName: string | null
  timezone: string
  telegramSessionActive?: boolean
}

export interface UpdateProfileBody {
  timezone: string
}

export interface UpdateProfileResponse {
  user: UserDto
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

export interface WsAuthTicketResponse {
  ticket: string
}

export interface StartParseBody {
  chatIds?: string[]
}

export interface ShareReportBody {
  chatId: string
  fileName: string
  mimeType?: string
  base64: string
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
  jobId?: string
  current: number
  total: number
  chatId: string | null
  chatName: string
  status: JobStatus | 'idle'
  message?: string
  scannedMessages?: number
  startTime?: number
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
  startedAt: string | null
  completedAt: string | null
  errorMessage?: string | null
}

export interface DeleteResponse {
  success: true
}

export interface ClearHistoryResponse extends DeleteResponse {
  deleted: number
}

export type DeleteHistoryItemResponse = DeleteResponse

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
  mineP25Sec: number | null
  mineP75Sec: number | null
  mineP95Sec: number | null
  theirsP25Sec: number | null
  theirsP75Sec: number | null
  theirsP95Sec: number | null
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

export interface StreakInfoDto {
  days: number
  startDate: string | null
  endDate: string | null
}

export interface ConversationFactsDto {
  activeDays: number
  longestGap: LongestGapDto | null
  mostActiveDate: MostActiveDateDto | null
  maxStreakDays: number
  maxStreak: StreakInfoDto | null
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

export interface HealthScoreDto {
  score: number
  label: 'strong' | 'steady' | 'fragile' | 'imbalanced'
  responseRate: number | null
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
}

export interface GroupReportDto {
  participants: GroupParticipantDto[]
  topPairs: GroupPairDto[]
  health: GroupHealthDto | null
  sharedVocabulary: TopItemDto[]
  uniqueGroupWords: TopItemDto[]
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
  averageMyResponseSec: number | null
  medianMyResponseSec: number | null
  medianTheirResponseSec: number | null
  myWordsPerMessage: number | null
  theirWordsPerMessage: number | null
  iWriteFirstPct: number | null
  responseRate: number | null
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
  activityDistribution: ActivityDistributionDto
  compositionStats: CompositionStatsDto
  availabilityProfile: AvailabilityProfileDto
  healthScore: HealthScoreDto | null
  groupReport: GroupReportDto | null
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
  ParseProgressEvent | ParseCompletedEvent | ParseFailedEvent | ParseCancelledEvent | ParseErrorEvent
