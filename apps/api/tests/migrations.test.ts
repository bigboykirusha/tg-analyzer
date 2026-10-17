import './setup'
import test from 'node:test'
import assert from 'node:assert/strict'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'

const MIGRATIONS = './src/db/migrations'

/** Copies the migration folder truncated to the first `count` entries. */
async function migrationsUpTo(count: number) {
  const dir = await mkdtemp(join(tmpdir(), 'migrations-'))
  await cp(MIGRATIONS, dir, { recursive: true })
  const journalPath = join(dir, 'meta/_journal.json')
  const journal = JSON.parse(await readFile(journalPath, 'utf8')) as { entries: unknown[] }
  journal.entries = journal.entries.slice(0, count)
  await writeFile(journalPath, JSON.stringify(journal))
  return dir
}

test('migration 0009 converts legacy chat statistics into report documents', async () => {
  const database = `migration_${Date.now()}`
  const admin = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await admin.connect()
  await admin.query(`CREATE DATABASE ${database}`)
  const url = new URL(process.env.DATABASE_URL!)
  url.pathname = `/${database}`
  const pool = new pg.Pool({ connectionString: url.toString() })
  const legacyFolder = await migrationsUpTo(9)

  try {
    const db = drizzle(pool)
    await migrate(db, { migrationsFolder: legacyFolder })
    await pool.query(
      `INSERT INTO users(id, tg_user_id, timezone) VALUES ('11111111-1111-4111-8111-111111111111', 42, 'Europe/Moscow')`,
    )
    await pool.query(`
      INSERT INTO chat_stats(user_id, tg_chat_id, chat_name, chat_type, total_messages, sent_messages, received_messages,
        media_count, first_message_at, last_message_at, hourly_activity, conversation_facts, response_rate, i_write_first_pct)
      VALUES ('11111111-1111-4111-8111-111111111111', 101, 'Mila', 'private', 10, 6, 4, 2,
        '2025-01-01T10:00:00Z', '2025-02-01T10:00:00Z', '{"10": 7, "22": 3}',
        '{"activeDays": 3, "maxStreakDays": 2, "trend": "stable", "mostActiveDate": {"date": null, "total": 0}}', 55.5, 60)`)
    await pool.query(`
      INSERT INTO chat_stats(user_id, tg_chat_id, chat_type, total_messages, hourly_activity_split, weekday_activity, group_participants)
      VALUES ('11111111-1111-4111-8111-111111111111', -1002, 'group', 5,
        '{"9": {"sent": 2, "received": 3, "total": 5}}', '{"1": {"sent": 2, "received": 3, "total": 5}}',
        '[{"id": "u1", "name": "A", "role": "ghost"}]')`)
    await pool.query(
      `INSERT INTO parse_jobs(user_id, status, chat_id) VALUES ('11111111-1111-4111-8111-111111111111', 'completed', 101)`,
    )

    await migrate(db, { migrationsFolder: MIGRATIONS })

    const { rows } = await pool.query(
      `SELECT tg_chat_id, title, chat_type, report FROM chat_reports ORDER BY tg_chat_id DESC`,
    )
    const [mila, group] = rows
    assert.equal(mila.title, 'Mila')
    assert.equal(mila.report.version, 2)
    assert.equal(mila.report.timeZone, 'Europe/Moscow')
    assert.equal(mila.report.activity.hourly.length, 24)
    assert.equal(mila.report.activity.hourly[10].total, 7)
    assert.equal(mila.report.composition.media, 2)
    assert.equal(mila.report.responses.responseRate, 55.5)
    assert.equal(mila.report.responses.iWriteFirstPct, 60)
    assert.deepEqual(mila.report.facts.maxStreak, { days: 2, startDate: null, endDate: null })
    assert.equal(mila.report.facts.mostActiveDate, null)
    assert.equal(mila.report.period.firstMessageAt, '2025-01-01T10:00:00.000Z')
    assert.equal(mila.report.group, null)

    assert.equal(group.title, '-1002')
    assert.equal(group.report.activity.weekday[1].total, 5)
    assert.equal(group.report.group.participants[0].id, 'u1')

    const tables = await pool.query(
      `SELECT to_regclass('chat_stats') AS a, to_regclass('global_stats') AS b, to_regclass('daily_activity') AS c`,
    )
    assert.deepEqual(tables.rows[0], { a: null, b: null, c: null })
    const job = await pool.query(`SELECT * FROM parse_jobs`)
    assert.equal(job.rows[0].chat_id, '101')
    assert.equal('bull_job_id' in job.rows[0], false)
  } finally {
    await pool.end()
    await admin.query(`DROP DATABASE IF EXISTS ${database}`)
    await admin.end()
    await rm(legacyFolder, { recursive: true, force: true })
  }
})
