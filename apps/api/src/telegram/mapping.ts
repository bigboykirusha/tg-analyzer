import type { ChatType, MessageInput } from '@tg-analyzer/shared'
import type { Api } from 'telegram'
import type { Dialog } from 'telegram/tl/custom/dialog.js'
import type { TelegramDialog } from './types'

const TELEGRAM_SERVICE_USER_ID = '777000'

type EntityLike = {
  className?: string
  bot?: boolean
  self?: boolean
  broadcast?: boolean
  megagroup?: boolean
  photo?: { className?: string }
  firstName?: string | null
  lastName?: string | null
  title?: string
  username?: string | null
}

export function dialogType(dialog: Pick<Dialog, 'isUser' | 'isGroup' | 'isChannel'> & { entity?: unknown }): ChatType {
  const entity = (dialog.entity ?? {}) as EntityLike
  if (dialog.isUser) return entity.bot ? 'bot' : 'private'
  if (dialog.isGroup) return 'group'
  if (dialog.isChannel) return 'channel'
  return 'unknown'
}

/** Saved Messages and the Telegram service account are not conversations. */
export function isSystemDialog(dialog: Pick<Dialog, 'id'> & { entity?: unknown }): boolean {
  const entity = (dialog.entity ?? {}) as EntityLike
  return entity.self === true || String(dialog.id) === TELEGRAM_SERVICE_USER_ID
}

export function toTelegramDialog(dialog: Dialog): TelegramDialog {
  const entity = (dialog.entity ?? {}) as EntityLike
  const id = String(dialog.id)
  return {
    id,
    title: (dialog.title ?? dialog.name ?? '').trim() || id,
    type: dialogType(dialog),
    lastMessageAt: dialog.date ? new Date(dialog.date * 1000).toISOString() : null,
    hasAvatar: Boolean(
      entity.photo && entity.photo.className !== 'ChatPhotoEmpty' && entity.photo.className !== 'UserProfilePhotoEmpty',
    ),
  }
}

function displayName(entity: EntityLike | undefined): string | null {
  if (!entity) return null
  const fullName = [entity.firstName, entity.lastName].filter(Boolean).join(' ').trim()
  return fullName || entity.title?.trim() || entity.username?.trim() || null
}

function messageKind(message: Api.Message): MessageInput['kind'] {
  if (!message.media) return 'text'
  if (message.voice) return 'voice'
  if (message.sticker) return 'sticker'
  if (message.photo || message.video || message.videoNote || message.gif) return 'media'
  if (message.document) return 'file'
  // Polls, locations, contacts, web previews of links with no attachment…
  return message.media.className === 'MessageMediaWebPage' ? 'text' : 'media'
}

type DocumentLike = {
  id?: { toString(): string }
  attributes?: Array<Record<string, unknown> & { className?: string }>
}

function attribute(document: unknown, className: string) {
  return (document as DocumentLike | undefined)?.attributes?.find((item) => item.className === className)
}

/** Seconds of a voice message or a video note. */
function recordingSeconds(message: Api.Message): number | null {
  const document = message.voice ?? message.videoNote
  if (!document) return null
  const audio = attribute(document, 'DocumentAttributeAudio') ?? attribute(document, 'DocumentAttributeVideo')
  const duration = Number(audio?.duration)
  return Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null
}

function sticker(message: Api.Message): MessageInput['sticker'] {
  const document = message.sticker as DocumentLike | undefined
  if (!document?.id) return null
  const info = attribute(document, 'DocumentAttributeSticker') as
    { alt?: string; stickerset?: { className?: string; id?: { toString(): string } } } | undefined
  const set = info?.stickerset
  return {
    id: document.id.toString(),
    emoji: info?.alt?.trim() || null,
    setId: set?.className === 'InputStickerSetID' && set.id ? set.id.toString() : null,
  }
}

function reactions(message: Api.Message): MessageInput['reactions'] {
  const results = message.reactions?.results
  if (!results?.length) return undefined
  return results.map((result) => {
    const reaction = result.reaction as { className?: string; emoticon?: string }
    const emoji =
      reaction.className === 'ReactionEmoji' && reaction.emoticon
        ? reaction.emoticon
        : reaction.className === 'ReactionPaid'
          ? 'paid'
          : 'custom'
    // `chosenOrder` is set on the reactions the current user put.
    return { emoji, count: result.count, mine: result.chosenOrder !== undefined && result.chosenOrder !== null }
  })
}

/**
 * Projects a gramjs message onto the metadata the analysis needs.
 * Returns null for service messages (joins, pins, calls…).
 */
export function toMessageInput(message: Api.Message | Api.MessageService | Api.MessageEmpty): MessageInput | null {
  if (message.className !== 'Message') return null

  const sender = (message as Api.Message & { _sender?: EntityLike })._sender
  return {
    id: String(message.id),
    date: new Date(message.date * 1000),
    outgoing: Boolean(message.out),
    text: message.message ?? '',
    senderId: message.senderId ? String(message.senderId) : null,
    senderName: displayName(sender),
    replyToId: message.replyTo?.replyToMsgId ? String(message.replyTo.replyToMsgId) : null,
    kind: messageKind(message),
    durationSec: recordingSeconds(message),
    round: Boolean(message.videoNote),
    reactions: reactions(message),
    sticker: message.sticker ? sticker(message) : null,
  }
}

export { displayName }

const PREVIEW_MAX_BYTES = 48 * 1024

/** A data URL for a small image, or null when the bytes are not a web image or too large. */
export function imageDataUrl(bytes: Buffer): string | null {
  if (!bytes.length || bytes.length > PREVIEW_MAX_BYTES) return null
  let type: string | null = null
  if (bytes.subarray(0, 4).toString('latin1') === 'RIFF' && bytes.subarray(8, 12).toString('latin1') === 'WEBP')
    type = 'image/webp'
  else if (bytes[0] === 0x89 && bytes.subarray(1, 4).toString('latin1') === 'PNG') type = 'image/png'
  else if (bytes[0] === 0xff && bytes[1] === 0xd8) type = 'image/jpeg'
  return type ? `data:${type};base64,${bytes.toString('base64')}` : null
}
