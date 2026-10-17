import { config } from '../config'
import { redis } from '../lib/redis'
import { FakeTelegramGateway } from './fake-gateway'
import { LiveTelegramGateway } from './live-gateway'
import type { TelegramGateway } from './types'

export * from './errors'
export type * from './types'

export const telegram: TelegramGateway =
  config.TELEGRAM_MODE === 'fake'
    ? new FakeTelegramGateway(redis)
    : new LiveTelegramGateway(redis, { apiId: config.TELEGRAM_API_ID, apiHash: config.TELEGRAM_API_HASH })
