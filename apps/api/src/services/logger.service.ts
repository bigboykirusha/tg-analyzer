import Fastify from 'fastify'

export const loggerOptions = {
  level: 'info',
  serializers: {
    req: (request: { id?: string; method: string; url: string }) => ({
      id: request.id,
      method: request.method,
      path: request.url.split('?')[0],
    }),
    err: (error: { name?: string }) => ({
      type: error.name ?? 'Error',
      message: 'Operation failed',
      stack: '',
    }),
  },
  redact: [
    'req.headers.authorization',
    'req.headers.cookie',
    'res.headers["set-cookie"]',
    '*.password',
    '*.phone',
    '*.code',
    '*.token',
    '*.sessionString',
  ],
}

export const logger = Fastify({ logger: loggerOptions }).log
