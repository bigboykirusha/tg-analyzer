import { Api, TelegramClient } from 'telegram'
import type { Dialog } from 'telegram/tl/custom/dialog.js'
import { Logger, LogLevel } from 'telegram/extensions/Logger.js'
import { computeCheck } from 'telegram/Password.js'
import { StringSession } from 'telegram/sessions/index.js'
import type { CodeDeliveryDto, CodeDeliveryType } from '@tg-analyzer/shared'
import type { Redis } from 'ioredis'
import { sleep } from '../lib/time'
import { normalizeTelegramError, TelegramLoginError } from './errors'
import { isSystemDialog, toMessageInput, toTelegramDialog } from './mapping'
import { acquireSessionLease } from './session-lease'
import type {
  HistoryPage,
  SentLoginCode,
  SignInResult,
  TelegramAccountApi,
  TelegramDialog,
  TelegramGateway,
  TelegramUser,
  WithSessionOptions,
} from './types'

const DIALOG_LIMIT = 500
const HISTORY_PAGE_SIZE = 100
/** Telethon's default pacing for long histories; keeps accounts clear of FLOOD_WAIT. */
const HISTORY_REQUEST_INTERVAL_MS = 1000
const PEER_CACHE_TTL_MS = 10 * 60 * 1000
const DEFAULT_LEASE_WAIT_MS = 15_000

interface CachedPeer {
  dialog: TelegramDialog
  input: Api.TypeInputPeer
  entity: unknown
}

async function attempt<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work()
  } catch (error) {
    throw normalizeTelegramError(error)
  }
}

function codeDeliveryType(
  type: Api.auth.TypeSentCodeType | Api.auth.TypeCodeType | undefined,
): CodeDeliveryType | null {
  if (!type) return null
  if (type instanceof Api.auth.SentCodeTypeApp) return 'app'
  if (
    type instanceof Api.auth.SentCodeTypeSms ||
    type instanceof Api.auth.SentCodeTypeSmsWord ||
    type instanceof Api.auth.SentCodeTypeSmsPhrase ||
    type instanceof Api.auth.SentCodeTypeFragmentSms ||
    type instanceof Api.auth.CodeTypeSms ||
    type instanceof Api.auth.CodeTypeFragmentSms
  ) {
    return 'sms'
  }
  if (type instanceof Api.auth.SentCodeTypeCall || type instanceof Api.auth.CodeTypeCall) return 'call'
  if (
    type instanceof Api.auth.SentCodeTypeFlashCall ||
    type instanceof Api.auth.SentCodeTypeMissedCall ||
    type instanceof Api.auth.CodeTypeFlashCall ||
    type instanceof Api.auth.CodeTypeMissedCall
  ) {
    return 'missed_call'
  }
  if (type instanceof Api.auth.SentCodeTypeEmailCode) return 'email'
  if (type instanceof Api.auth.SentCodeTypeSetUpEmailRequired) return 'email_setup_required'
  // Firebase SMS needs app attestation that only official mobile apps can pass.
  return 'unsupported'
}

function toSentLoginCode(sent: Api.auth.TypeSentCode, session: string): SentLoginCode {
  if (!(sent instanceof Api.auth.SentCode)) {
    // SentCodeSuccess (already authorised) or a paid-SMS requirement: not a code flow this app supports.
    throw new Error(`Unexpected auth.sendCode result: ${sent.className}`)
  }
  const { type } = sent
  const length = 'length' in type && typeof type.length === 'number' ? type.length : null
  const delivery: CodeDeliveryDto = {
    type: codeDeliveryType(type) ?? 'unsupported',
    emailPattern: type instanceof Api.auth.SentCodeTypeEmailCode ? type.emailPattern : null,
    length,
    nextType: codeDeliveryType(sent.nextType),
    timeoutSec: typeof sent.timeout === 'number' ? sent.timeout : null,
  }
  return { phoneCodeHash: sent.phoneCodeHash, session, delivery }
}

function toTelegramUser(user: Api.User): TelegramUser {
  return { id: String(user.id), username: user.username ?? null, firstName: user.firstName ?? null }
}

export class LiveTelegramGateway implements TelegramGateway {
  /** Per user: dialog peers with access hashes, so avatars and histories skip a full dialog fetch. */
  private peerCache = new Map<string, { expiresAt: number; peers: Map<string, CachedPeer>; truncated: boolean }>()

  constructor(
    private readonly redis: Redis,
    private readonly credentials: { apiId: number; apiHash: string },
  ) {}

  private createClient(session: string) {
    return new TelegramClient(new StringSession(session), this.credentials.apiId, this.credentials.apiHash, {
      connectionRetries: 3,
      baseLogger: new Logger(LogLevel.ERROR),
      deviceModel: 'TG Analyzer',
      appVersion: '1.0',
    })
  }

  private async withClient<T>(session: string, work: (client: TelegramClient) => Promise<T>): Promise<T> {
    const client = this.createClient(session)
    try {
      await attempt(() => client.connect())
      return await attempt(() => work(client))
    } finally {
      await client.destroy().catch(() => undefined)
    }
  }

  readonly login = {
    // Raw auth.sendCode instead of client.sendCode: the helper drops the delivery
    // type, and the user must know whether to look in the app, SMS or email.
    sendCode: (phone: string) =>
      this.withClient('', async (client) => {
        const sent = await client.invoke(
          new Api.auth.SendCode({
            phoneNumber: phone,
            apiId: this.credentials.apiId,
            apiHash: this.credentials.apiHash,
            settings: new Api.CodeSettings({}),
          }),
        )
        return toSentLoginCode(sent, String(client.session.save()))
      }),

    resendCode: (input: { session: string; phone: string; phoneCodeHash: string }) =>
      this.withClient(input.session, async (client) => {
        const sent = await client.invoke(
          new Api.auth.ResendCode({ phoneNumber: input.phone, phoneCodeHash: input.phoneCodeHash }),
        )
        return toSentLoginCode(sent, String(client.session.save()))
      }),

    signIn: (input: { session: string; phone: string; phoneCodeHash: string; code: string; viaEmail?: boolean }) =>
      this.withClient(input.session, async (client): Promise<SignInResult> => {
        try {
          const result = await client.invoke(
            new Api.auth.SignIn({
              phoneNumber: input.phone,
              phoneCodeHash: input.phoneCodeHash,
              ...(input.viaEmail
                ? { emailVerification: new Api.EmailVerificationCode({ code: input.code }) }
                : { phoneCode: input.code }),
            }),
          )
          if (!(result instanceof Api.auth.Authorization) || !(result.user instanceof Api.User)) {
            // Unregistered numbers would require a sign-up flow, which this app does not offer.
            throw new TelegramLoginError('phone_invalid')
          }
          return { status: 'authorized', session: String(client.session.save()), user: toTelegramUser(result.user) }
        } catch (error) {
          if (/SESSION_PASSWORD_NEEDED/.test(String((error as { errorMessage?: string }).errorMessage))) {
            const password = await client.invoke(new Api.account.GetPassword())
            return { status: 'password_required', session: String(client.session.save()), hint: password.hint ?? null }
          }
          throw error
        }
      }),

    checkPassword: (input: { session: string; password: string }) =>
      this.withClient(input.session, async (client) => {
        const password = await client.invoke(new Api.account.GetPassword())
        const result = await client.invoke(
          new Api.auth.CheckPassword({ password: await computeCheck(password, input.password) }),
        )
        if (!(result instanceof Api.auth.Authorization) || !(result.user instanceof Api.User)) {
          throw new TelegramLoginError('password_invalid')
        }
        return { session: String(client.session.save()), user: toTelegramUser(result.user) }
      }),
  }

  async withSession<T>(
    userId: string,
    session: string,
    work: (api: TelegramAccountApi) => Promise<T>,
    options: WithSessionOptions = {},
  ): Promise<T> {
    const lease = await acquireSessionLease(this.redis, userId, options.waitMs ?? DEFAULT_LEASE_WAIT_MS)
    try {
      return await this.withClient(session, (client) => work(this.accountApi(userId, client, lease.signal)))
    } finally {
      await lease.release()
    }
  }

  private accountApi(userId: string, client: TelegramClient, signal: AbortSignal): TelegramAccountApi {
    let lastHistoryRequestAt = 0
    const guard = () => {
      if (signal.aborted) throw signal.reason
    }

    const loadPeers = async () => {
      const cached = this.peerCache.get(userId)
      if (cached && cached.expiresAt > Date.now()) return cached

      const dialogs = (await client.getDialogs({ limit: DIALOG_LIMIT })) as Dialog[]
      const peers = new Map<string, CachedPeer>()
      for (const dialog of dialogs) {
        if (isSystemDialog(dialog)) continue
        const mapped = toTelegramDialog(dialog)
        peers.set(mapped.id, { dialog: mapped, input: dialog.inputEntity, entity: dialog.entity })
      }
      const entry = { expiresAt: Date.now() + PEER_CACHE_TTL_MS, peers, truncated: dialogs.length >= DIALOG_LIMIT }
      this.peerCache.set(userId, entry)
      return entry
    }

    const findPeer = async (chatId: string) => {
      const cached = this.peerCache.get(userId)
      if (cached && cached.expiresAt > Date.now() && cached.peers.has(chatId)) return cached.peers.get(chatId)!
      // A newly created chat may be missing from a still-fresh cache.
      this.peerCache.delete(userId)
      return (await loadPeers()).peers.get(chatId) ?? null
    }

    return {
      listDialogs: async () => {
        guard()
        this.peerCache.delete(userId)
        const { peers, truncated } = await attempt(loadPeers)
        return { dialogs: [...peers.values()].map((peer) => peer.dialog), truncated }
      },

      getDialog: async (chatId) => {
        guard()
        return (await attempt(() => findPeer(chatId)))?.dialog ?? null
      },

      getHistory: async (chatId, offsetId): Promise<HistoryPage> => {
        guard()
        const peer = await attempt(() => findPeer(chatId))
        if (!peer) throw new Error(`Chat ${chatId} is not available`)

        const wait = lastHistoryRequestAt + HISTORY_REQUEST_INTERVAL_MS - Date.now()
        if (wait > 0) await sleep(wait, signal)
        guard()
        lastHistoryRequestAt = Date.now()

        const page = await attempt(() => client.getMessages(peer.input, { limit: HISTORY_PAGE_SIZE, offsetId }))
        const oldest = page[page.length - 1]
        return {
          messages: page.map(toMessageInput).filter((message) => message !== null),
          total: typeof page.total === 'number' ? page.total : null,
          nextOffsetId: page.length < HISTORY_PAGE_SIZE || !oldest ? null : oldest.id,
        }
      },

      downloadAvatar: async (chatId) => {
        guard()
        const target = chatId === null ? 'me' : (await attempt(() => findPeer(chatId)))?.entity
        if (!target) return null
        const photo = await attempt(() => client.downloadProfilePhoto(target as never, { isBig: false }))
        return Buffer.isBuffer(photo) && photo.length > 0 ? photo : null
      },

      logOut: async () => {
        this.peerCache.delete(userId)
        await attempt(() => client.invoke(new Api.auth.LogOut()))
      },
    }
  }

  async close() {
    this.peerCache.clear()
  }
}
