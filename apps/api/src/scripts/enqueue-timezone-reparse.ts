import { inArray } from 'drizzle-orm'
import { db, pool, schema } from '../db'
import { parseDialogsQueue } from '../queues/parse.queue'
import {
  attachBullJobId,
  createParseJob,
  findCurrentParseJob,
  getActiveSessionForUser,
  markActiveJob,
} from '../services/session.service'

async function main() {
  const userIds = process.argv.slice(2)
  const users = userIds.length
    ? await db.query.users.findMany({ where: inArray(schema.users.id, userIds) })
    : await db.query.users.findMany()

  for (const user of users) {
    const session = await getActiveSessionForUser(user.id)
    if (!session) {
      console.info(`[skip] ${user.id} has no active Telegram session`)
      continue
    }

    const activeJob = await findCurrentParseJob(user.id)
    if (activeJob) {
      console.info(`[skip] ${user.id} already has active job ${activeJob.id}`)
      continue
    }

    const jobId = await createParseJob({
      userId: user.id,
      chatId: null,
      chatName: 'Timezone backfill',
    })
    const bullJob = await parseDialogsQueue.add('parse-dialogs', {
      userId: user.id,
      jobId,
    })
    await attachBullJobId(jobId, String(bullJob.id))
    await markActiveJob(user.id, jobId)
    console.info(`[queued] ${user.id} -> ${jobId}`)
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
