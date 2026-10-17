import type { ChatType, CodeDeliveryDto, MessageInput } from '@tg-analyzer/shared'

export interface TelegramUser {
  id: string
  username: string | null
  firstName: string | null
}

export interface TelegramDialog {
  /** Marked id as used by Bot API / gramjs: negative for groups and channels. */
  id: string
  title: string
  type: ChatType
  hasAvatar: boolean
}

export interface HistoryPage {
  /** Newest first. */
  messages: MessageInput[]
  /** Total number of messages in the chat when Telegram reports it. */
  total: number | null
  /** Pass as `offsetId` to fetch the next (older) page; null when exhausted. */
  nextOffsetId: number | null
}

export type SignInResult =
  | { status: 'authorized'; session: string; user: TelegramUser }
  | { status: 'password_required'; session: string; hint: string | null }

export interface SentLoginCode {
  phoneCodeHash: string
  session: string
  delivery: CodeDeliveryDto
}

/** Stateless login steps. The unauthorised session string carries state between requests. */
export interface TelegramLoginApi {
  sendCode(phone: string): Promise<SentLoginCode>
  /** Asks Telegram for the next delivery channel (usually SMS or a call) on the same login attempt. */
  resendCode(input: { session: string; phone: string; phoneCodeHash: string }): Promise<SentLoginCode>
  signIn(input: {
    session: string
    phone: string
    phoneCodeHash: string
    code: string
    /** The code came to the login email: Telegram expects it as an email verification. */
    viaEmail?: boolean
  }): Promise<SignInResult>
  checkPassword(input: { session: string; password: string }): Promise<{ session: string; user: TelegramUser }>
}

/** Operations on an authorised account. Only valid inside {@link TelegramGateway.withSession}. */
export interface TelegramAccountApi {
  listDialogs(): Promise<{ dialogs: TelegramDialog[]; truncated: boolean }>
  getDialog(chatId: string): Promise<TelegramDialog | null>
  getHistory(chatId: string, offsetId: number): Promise<HistoryPage>
  /** JPEG bytes of the chat photo, or of the user's own photo when `chatId` is null. */
  downloadAvatar(chatId: string | null): Promise<Buffer | null>
  logOut(): Promise<void>
}

export interface WithSessionOptions {
  /** How long to wait for another process to release the session. */
  waitMs?: number
}

export interface TelegramGateway {
  readonly login: TelegramLoginApi
  /**
   * Runs `work` with exclusive use of the user's Telegram session across all
   * API and worker processes. Throws {@link TelegramBusyError} when the
   * session stays locked longer than `waitMs`.
   */
  withSession<T>(
    userId: string,
    session: string,
    work: (api: TelegramAccountApi) => Promise<T>,
    options?: WithSessionOptions,
  ): Promise<T>
  close(): Promise<void>
}
