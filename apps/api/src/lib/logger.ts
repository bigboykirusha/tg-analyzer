import { pino, stdSerializers, type LoggerOptions } from 'pino'
import { config } from '../config'

export const loggerOptions: LoggerOptions = {
  level: config.NODE_ENV === 'test' ? 'silent' : config.LOG_LEVEL,
  serializers: {
    err: stdSerializers.err,
    // Never log query strings: the WebSocket handshake carries a one-time ticket there.
    req: (request: { id?: string; method?: string; url?: string }) => ({
      id: request.id,
      method: request.method,
      path: request.url?.split('?')[0],
    }),
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.phone',
      '*.code',
      '*.token',
      '*.ticket',
      '*.session',
      '*.sessionString',
    ],
    censor: '[redacted]',
  },
}

export const logger = pino(loggerOptions)
