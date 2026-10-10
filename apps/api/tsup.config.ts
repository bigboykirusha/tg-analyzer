import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/workers/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  clean: true,
  noExternal: ['@tg-analyzer/shared'],
  external: [
    'telegram',
    'dotenv',
    'pg',
    'ioredis',
    'bullmq',
    'drizzle-orm',
    'fastify',
    '@fastify/cookie',
    '@fastify/cors',
    '@fastify/jwt',
    '@fastify/rate-limit',
    '@fastify/websocket',
    'jsonwebtoken',
    'zod',
  ],
})
