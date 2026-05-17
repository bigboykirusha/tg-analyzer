import type { ParseProgressDto, ParseStatusResponse } from '@tg-analyzer/shared'

export function normalizeParseStatus(input: {
  activeJob: {
    id: string
    status: string
    chatId: number | null
  } | null
  cachedProgress: Partial<ParseProgressDto> | null
}): ParseStatusResponse {
  const { activeJob, cachedProgress } = input
  if (!activeJob) {
    return {
      jobId: null,
      status: 'idle',
      progress: {
        current: 0,
        total: 0,
        chatId: null,
        chatName: '',
        status: 'idle',
        message: '',
        scannedMessages: 0,
      },
    }
  }

  const normalizedStatus = activeJob.status === 'pending' ? 'pending' : 'running'
  const cachedStatus = cachedProgress?.status
  const activeCompatible = cachedStatus === 'pending' || cachedStatus === 'running'

  return {
    jobId: activeJob.id,
    status: normalizedStatus,
    progress: {
      current: typeof cachedProgress?.current === 'number' ? cachedProgress.current : 0,
      total: typeof cachedProgress?.total === 'number' ? cachedProgress.total : 0,
      chatId: cachedProgress?.chatId ?? (activeJob.chatId ? String(activeJob.chatId) : null),
      chatName: cachedProgress?.chatName ?? '',
      status: activeCompatible ? cachedStatus : normalizedStatus,
      message: cachedProgress?.message ?? (normalizedStatus === 'pending' ? 'Queued parse job' : ''),
      scannedMessages: typeof cachedProgress?.scannedMessages === 'number' ? cachedProgress.scannedMessages : 0,
      startTime: typeof cachedProgress?.startTime === 'number' ? cachedProgress.startTime : undefined,
    },
  }
}
