import { createHash } from 'node:crypto'
import type { MessageInput } from '@tg-analyzer/shared'
import type { Redis } from 'ioredis'
import { DAY_MS, HOUR_MS, MINUTE_MS, sleep } from '../lib/time'
import { TelegramLoginError } from './errors'
import { acquireSessionLease } from './session-lease'
import type { HistoryPage, TelegramAccountApi, TelegramDialog, TelegramGateway, TelegramUser } from './types'

/**
 * A deterministic stand-in for Telegram used by `TELEGRAM_MODE=fake`.
 *
 * - Any phone number works; the login code is always `12345`.
 * - Numbers ending in `9` have two-step verification with the password `secret`.
 * - Every account sees the same set of generated chats with realistic rhythm.
 */
export const FAKE_LOGIN_CODE = '12345'
export const FAKE_PASSWORD = 'secret'

const PAGE_SIZE = 100
const PAGE_DELAY_MS = 120

interface FakeChatSpec {
  id: string
  title: string
  type: TelegramDialog['type']
  messages: number
  days: number
  /** Share of messages written by the current user. */
  myShare: number
  /** Days since the last message, so the demo list has old and fresh chats. */
  quietDays?: number
  members?: string[]
}

// prettier-ignore
const CHATS: FakeChatSpec[] = [
  { id: '1001', title: 'Мила', type: 'private', messages: 4800, days: 420, myShare: 0.52 },
  { id: '1002', title: 'Мама', type: 'private', messages: 1900, days: 700, myShare: 0.38 },
  { id: '1003', title: 'Артём Ковалёв', type: 'private', messages: 820, days: 260, myShare: 0.61, quietDays: 3 },
  { id: '1004', title: 'Sofia Martins', type: 'private', messages: 350, days: 90, myShare: 0.47, quietDays: 12 },
  { id: '1005', title: 'Дима (работа)', type: 'private', messages: 2600, days: 300, myShare: 0.44 },
  { id: '1006', title: 'Катя', type: 'private', messages: 130, days: 40, myShare: 0.7 },
  { id: '1007', title: 'Олег Смирнов', type: 'private', messages: 60, days: 600, myShare: 0.5, quietDays: 140 },
  { id: '1008', title: 'Анна Петрова', type: 'private', messages: 1200, days: 180, myShare: 0.55 },
  { id: '-1002001', title: 'Продуктовая команда', type: 'group', messages: 9000, days: 365, myShare: 0.12,
    members: ['Алексей', 'Мария', 'Игорь', 'Наташа', 'Сергей', 'Юля', 'Павел'] },
  { id: '-1002002', title: 'Семья', type: 'group', messages: 3100, days: 800, myShare: 0.2,
    members: ['Мама', 'Папа', 'Лиза', 'Бабушка'] },
  { id: '-1002003', title: 'Бег по утрам 🏃', type: 'group', messages: 1400, days: 210, myShare: 0.08,
    members: ['Коля', 'Вера', 'Тимур', 'Ира', 'Гоша', 'Лена', 'Макс', 'Оля', 'Рома'] },
  { id: '-1002004', title: 'Weekend plans', type: 'group', messages: 420, days: 60, myShare: 0.25,
    members: ['Sam', 'Lucas', 'Emma'] },
  { id: '-1003001', title: 'Новости технологий', type: 'channel', messages: 0, days: 0, myShare: 0 },
  { id: '-1003002', title: 'Дизайн-дайджест', type: 'channel', messages: 0, days: 0, myShare: 0 },
  { id: '5001', title: 'Погодный бот', type: 'bot', messages: 0, days: 0, myShare: 0 },
]

// prettier-ignore
const PHRASES = [
  'привет', 'как дела?', 'ок, договорились', 'давай созвонимся вечером', 'я уже еду', 'отлично 👍',
  'посмотри, пожалуйста, документ', 'спасибо большое!', 'завтра в десять?', 'ахах 😂', 'скинь ссылку',
  'надо обсудить релиз', 'кофе?', 'я дома', 'слушай, а ты видел новый дизайн?', 'супер, мне нравится ❤️',
  'давай на выходных', 'сегодня не получится', 'созвон перенесли', 'бегу на тренировку', 'хорошего дня ☀️',
  'what do you think?', 'sounds good', 'see you tomorrow', 'great job 🎉', 'let me check',
  'кстати, фильм был классный', 'запиши меня', 'дедлайн в пятницу', 'отправил', 'поздравляю!! 🥳',
]

const MORNING_PHRASES = ['доброе утро ☀️', 'с добрым утром)', 'утречко', 'доброоое утро', 'good morning!']
const NIGHT_PHRASES = ['спокойной ночи', 'споки 💤', 'сладких снов', 'всё, я спать', 'good night']
const REACTIONS = ['❤', '❤', '❤', '👍', '👍', '😂', '😂', '🔥', '🥰', '🤔']
// prettier-ignore
const STICKERS = [
  { id: 'demo-cat-1', emoji: '😺', setId: 'cats' }, { id: 'demo-cat-2', emoji: '😹', setId: 'cats' },
  { id: 'demo-cat-3', emoji: '😿', setId: 'cats' }, { id: 'demo-dog-1', emoji: '🐶', setId: 'dogs' },
  { id: 'demo-dog-2', emoji: '👍', setId: 'dogs' }, { id: 'demo-duck-1', emoji: '🦆', setId: 'ducks' },
  { id: 'demo-duck-2', emoji: '❤️', setId: 'ducks' }, { id: 'demo-duck-3', emoji: '😴', setId: 'ducks' },
]

function hashToUnit(value: string): number {
  return createHash('sha256').update(value).digest().readUInt32BE(0) / 2 ** 32
}

/** Small deterministic PRNG (mulberry32). */
function random(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32
  }
}

/** Generates the chat from oldest to newest; message ids are 1…N. */
function generateChat(spec: FakeChatSpec, now: number): MessageInput[] {
  const rand = random(Math.floor(hashToUnit(spec.id) * 2 ** 32))
  const messages: MessageInput[] = []
  const start = now - spec.days * DAY_MS
  const gapMs = (spec.days * DAY_MS) / Math.max(spec.messages, 1)
  let ts = start

  for (let id = 1; id <= spec.messages; id += 1) {
    // Bursty rhythm: short replies inside a conversation, long pauses between them.
    const burst = rand() < 0.82
    ts += burst ? rand() * Math.min(gapMs, 6 * MINUTE_MS) : rand() * gapMs * 4
    const local = new Date(ts)
    // Pull night messages towards the evening for a believable daily curve.
    if (local.getUTCHours() < 6 && rand() < 0.75) ts += (6 + rand() * 4) * HOUR_MS
    if (ts > now) ts = now - (spec.messages - id) * 1000

    const outgoing = rand() < spec.myShare
    const memberIndex = Math.floor(rand() * (spec.members?.length ?? 1))
    const sender = outgoing ? 'self' : spec.members ? `member-${memberIndex}` : spec.id
    const kindRoll = rand()
    const kind: MessageInput['kind'] =
      kindRoll < 0.06
        ? 'media'
        : kindRoll < 0.09
          ? 'sticker'
          : kindRoll < 0.11
            ? 'voice'
            : kindRoll < 0.12
              ? 'file'
              : 'text'
    const hour = new Date(ts).getUTCHours()
    const pick = (list: readonly string[]) => list[Math.floor(rand() * list.length)]!
    let text = ''
    if (kind === 'text') {
      if (hour >= 6 && hour < 10 && rand() < 0.3) text = pick(MORNING_PHRASES)
      else if ((hour >= 22 || hour < 2) && rand() < 0.3) text = pick(NIGHT_PHRASES)
      else text = pick(PHRASES)
    }
    const round = kind === 'media' && rand() < 0.3
    // Stickers and reactions lean towards a few favourites, as in real chats.
    const sticker = kind === 'sticker' ? STICKERS[Math.floor(rand() * rand() * STICKERS.length)]! : null
    const reacted = rand() < (spec.members ? 0.15 : 0.1)
    const reactionCount = spec.members ? 1 + Math.floor(rand() * 4) : 1

    messages.push({
      id: String(id),
      date: new Date(ts),
      outgoing,
      text,
      senderId: outgoing ? 'self' : sender,
      senderName: outgoing ? null : (spec.members?.[memberIndex] ?? spec.title),
      replyToId: spec.members && id > 1 && rand() < 0.15 ? String(Math.max(1, id - 1 - Math.floor(rand() * 5))) : null,
      kind,
      durationSec:
        kind === 'voice' ? Math.round(3 + rand() * rand() * 240) : round ? Math.round(5 + rand() * 55) : null,
      round,
      sticker,
      reactions: reacted
        ? [
            {
              emoji: REACTIONS[Math.floor(rand() * REACTIONS.length)]!,
              count: reactionCount,
              // In a private chat the other side reacts to my messages and I react to theirs.
              mine: spec.members ? rand() < 0.1 : !outgoing,
            },
          ]
        : undefined,
    })
  }
  // The bursty walk ends well before `now`; move the chat forward by whole days so it
  // stays current (the last-month summary needs it) and keeps its hours of the day.
  const lastMs = messages.at(-1)?.date.getTime() ?? now
  const shiftMs = Math.floor((now - lastMs) / DAY_MS) * DAY_MS
  if (shiftMs > 0) for (const message of messages) message.date = new Date(message.date.getTime() + shiftMs)
  return messages
}

function userFromPhone(phone: string): TelegramUser {
  const digits = phone.replace(/\D/g, '')
  return {
    id: String(100_000 + Math.floor(hashToUnit(digits) * 9_000_000)),
    username: `demo_${digits.slice(-4)}`,
    firstName: 'Demo',
  }
}

function toDialog(spec: FakeChatSpec, lastMessage: MessageInput | undefined): TelegramDialog {
  return {
    id: spec.id,
    title: spec.title,
    type: spec.type,
    hasAvatar: false,
    lastMessageAt: lastMessage?.date.toISOString() ?? null,
  }
}

export class FakeTelegramGateway implements TelegramGateway {
  private generated = new Map<string, MessageInput[]>()

  constructor(private readonly redis: Redis) {}

  readonly login = {
    sendCode: async (phone: string) => {
      if (phone.replace(/\D/g, '').length < 7) throw new TelegramLoginError('phone_invalid')
      return {
        phoneCodeHash: `fake-${hashToUnit(phone + Date.now())
          .toString(36)
          .slice(2)}`,
        session: `pending:${phone}`,
        delivery: { type: 'app' as const, emailPattern: null, length: 5, nextType: 'sms' as const, timeoutSec: 60 },
      }
    },
    resendCode: async (input: { session: string; phone: string; phoneCodeHash: string }) => ({
      phoneCodeHash: input.phoneCodeHash,
      session: input.session,
      delivery: { type: 'sms' as const, emailPattern: null, length: 5, nextType: null, timeoutSec: null },
    }),
    signIn: async (input: { session: string; phone: string; code: string }) => {
      if (input.code !== FAKE_LOGIN_CODE) throw new TelegramLoginError('code_invalid')
      if (input.phone.endsWith('9')) {
        return { status: 'password_required' as const, session: `password:${input.phone}`, hint: 'secret' }
      }
      return { status: 'authorized' as const, session: `fake:${input.phone}`, user: userFromPhone(input.phone) }
    },
    checkPassword: async (input: { session: string; password: string }) => {
      if (input.password !== FAKE_PASSWORD) throw new TelegramLoginError('password_invalid')
      const phone = input.session.replace(/^password:/, '')
      return { session: `fake:${phone}`, user: userFromPhone(phone) }
    },
  }

  async withSession<T>(
    userId: string,
    _session: string,
    work: (api: TelegramAccountApi) => Promise<T>,
    options: { waitMs?: number } = {},
  ): Promise<T> {
    const lease = await acquireSessionLease(this.redis, userId, options.waitMs ?? 15_000)
    try {
      return await work(this.accountApi())
    } finally {
      await lease.release()
    }
  }

  private messagesOf(spec: FakeChatSpec) {
    let messages = this.generated.get(spec.id)
    if (!messages) {
      // Anchor generation to the current day so reports always look recent.
      const today = Math.floor(Date.now() / DAY_MS) * DAY_MS + 20 * HOUR_MS
      messages = generateChat(spec, today - (spec.quietDays ?? 0) * DAY_MS)
      this.generated.set(spec.id, messages)
    }
    return messages
  }

  private accountApi(): TelegramAccountApi {
    return {
      listDialogs: async () => ({
        dialogs: CHATS.map((spec) => toDialog(spec, this.messagesOf(spec).at(-1))),
        truncated: false,
      }),
      getDialog: async (chatId) => {
        const spec = CHATS.find((chat) => chat.id === chatId)
        return spec ? toDialog(spec, this.messagesOf(spec).at(-1)) : null
      },
      getHistory: async (chatId, offsetId): Promise<HistoryPage> => {
        const spec = CHATS.find((chat) => chat.id === chatId)
        if (!spec) throw new Error(`Chat ${chatId} is not available`)
        await sleep(PAGE_DELAY_MS)

        const all = this.messagesOf(spec)
        const end = offsetId > 0 ? offsetId - 1 : all.length
        const start = Math.max(0, end - PAGE_SIZE)
        const page = all.slice(start, end).reverse()
        return { messages: page, total: all.length, nextOffsetId: start > 0 ? start + 1 : null }
      },
      countRecent: async (chatId, since) => {
        const spec = CHATS.find((chat) => chat.id === chatId)
        if (!spec) throw new Error(`Chat ${chatId} is not available`)
        const recent = this.messagesOf(spec).filter((message) => message.date >= since)
        return { messages: recent.length, mine: recent.filter((message) => message.outgoing).length }
      },
      downloadAvatar: async () => null,
      // The demo has no sticker files: the report shows each sticker's emoji instead.
      stickerPreviews: async () => new Map(),
      logOut: async () => undefined,
    }
  }

  async close() {
    this.generated.clear()
  }
}
