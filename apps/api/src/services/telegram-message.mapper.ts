import type { AggregationMessageInput } from '@tg-analyzer/shared'
import type { TelegramMessageLike } from './telegram.service'

export function projectTelegramMessageMetadata(message: TelegramMessageLike): AggregationMessageInput {
  return {
    id: message?.id,
    message: typeof message?.message === 'string' ? message.message : '',
    date: normalizeMessageDate(message?.date),
    outgoing: Boolean(message?.outgoing ?? message?.out),
    senderId: extractSenderId(message),
    senderName: extractSenderName(message),
    replyToMessageId: extractReplyToMessageId(message),
    media: Boolean(message?.media),
    voice: Boolean(message?.voice),
    sticker: Boolean(message?.sticker),
    file: Boolean(message?.file),
  }
}

function extractSenderId(message: TelegramMessageLike) {
  const candidate =
    readNestedValue(message, ['senderId', 'value']) ??
    readNestedValue(message, ['senderId', 'userId']) ??
    readNestedValue(message, ['senderId', 'channelId']) ??
    readNestedValue(message, ['senderId', 'chatId']) ??
    readNestedValue(message, ['fromId', 'value']) ??
    readNestedValue(message, ['fromId', 'userId']) ??
    readNestedValue(message, ['fromId', 'channelId']) ??
    readNestedValue(message, ['fromId', 'chatId']) ??
    readNestedValue(message, ['sender', 'id']) ??
    readNestedValue(message, ['sender', 'userId'])

  return candidate !== null && candidate !== undefined ? String(candidate) : null
}

function extractSenderName(message: TelegramMessageLike) {
  const sender = readNestedValue(message, ['sender'])
  if (sender && typeof sender === 'object') {
    const senderRecord = sender as Record<string, unknown>
    const firstName = typeof senderRecord.firstName === 'string' ? senderRecord.firstName : ''
    const lastName = typeof senderRecord.lastName === 'string' ? senderRecord.lastName : ''
    const title = typeof senderRecord.title === 'string' ? senderRecord.title : ''
    const username = typeof senderRecord.username === 'string' ? senderRecord.username : ''
    const combined = [firstName, lastName].filter(Boolean).join(' ').trim()
    if (combined) {
      return combined
    }
    if (title) {
      return title
    }
    if (username) {
      return username
    }
  }

  const directName =
    typeof readNestedValue(message, ['senderName']) === 'string'
      ? String(readNestedValue(message, ['senderName']))
      : null

  return directName
}

function extractReplyToMessageId(message: TelegramMessageLike) {
  const candidate =
    readNestedValue(message, ['replyTo', 'replyToMsgId']) ??
    readNestedValue(message, ['replyTo', 'replyToMsgIds', 0]) ??
    readNestedValue(message, ['replyToMessageId']) ??
    readNestedValue(message, ['replyToMsgId'])

  return candidate !== null && candidate !== undefined ? String(candidate) : null
}

function readNestedValue(source: unknown, path: Array<string | number>) {
  let current = source
  for (const segment of path) {
    if (!current || typeof current !== 'object') {
      return null
    }
    current = (current as Record<string | number, unknown>)[segment]
  }
  return current ?? null
}

function normalizeMessageDate(value: unknown): Date | undefined {
  if (!value) {
    return undefined
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : new Date(value)
  }

  if (typeof value === 'number') {
    const timestamp = value < 1e12 ? value * 1000 : value
    const date = new Date(timestamp)
    return Number.isNaN(date.getTime()) ? undefined : date
  }

  if (typeof value === 'string') {
    const numeric = Number(value)
    if (!Number.isNaN(numeric) && value.trim() !== '') {
      return normalizeMessageDate(numeric)
    }
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? undefined : date
  }

  if (typeof value === 'object' && value !== null && 'valueOf' in value && typeof value.valueOf === 'function') {
    const resolved = value.valueOf()
    if (resolved !== value) {
      return normalizeMessageDate(resolved)
    }
  }

  return undefined
}
