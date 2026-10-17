// Integration tests need PostgreSQL and Redis. `docker compose -f docker-compose.test.yml up -d`
// starts both on the default ports below; override with TEST_DATABASE_URL / TEST_REDIS_URL.
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://test:integration-only@127.0.0.1:55432/tganalyzer_test'
process.env.REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://127.0.0.1:56379/0'
process.env.TELEGRAM_MODE = 'fake'
process.env.CORS_ORIGIN = 'http://localhost:3000'
process.env.COOKIE_SECURE = 'false'
process.env.CHAT_REPARSE_COOLDOWN_MINUTES = '60'
process.env.SESSION_ENCRYPTION_KEY = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90'
process.env.JWT_SECRET = 'integration-access-secret-0123456789abcdef'
process.env.JWT_REFRESH_SECRET = 'integration-refresh-secret-0123456789abcdef'
process.env.AUTH_RATE_LIMIT_MAX = '5'
