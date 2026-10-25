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
  }
}

export { displayName }
