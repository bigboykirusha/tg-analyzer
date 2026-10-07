import type { ParseProgressDto, ParseProgressWsEvent } from './api'

export function applyParseProgressEvent(current: ParseProgressDto, event: ParseProgressWsEvent): ParseProgressDto {
  switch (event.type) {
    case 'progress':
      return {
        current: event.current,
        total: event.total,
        chatId: event.chatId ?? null,
        chatName: event.chatName ?? '',
        status: event.status ?? 'running',
        message: event.message ?? '',
        scannedMessages: event.scannedMessages ?? 0,
      }
    case 'completed':
      return {
        ...current,
        chatId: event.chatId ?? current.chatId ?? null,
        status: 'completed',
        message: event.message ?? 'Parse completed',
      }
    case 'failed':
    case 'error':
      return {
        ...current,
        chatId: 'chatId' in event ? (event.chatId ?? current.chatId ?? null) : current.chatId,
        status: 'failed',
        message: event.message,
      }
    case 'cancelled':
      return {
        ...current,
        chatId: event.chatId ?? current.chatId ?? null,
        status: 'cancelled',
        message: event.message ?? 'Parse cancelled',
      }
  }
}
