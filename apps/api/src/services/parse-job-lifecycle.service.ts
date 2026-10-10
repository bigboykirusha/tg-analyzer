export function shouldRetryParseJob(
  job: { attemptsMade: number; attempts: number | undefined },
  error: { name?: string },
) {
  if (error.name === 'ParseJobCancelledError' || error.name === 'TelegramSessionRevokedError') {
    return false
  }

  return job.attemptsMade < (job.attempts ?? 1)
}
