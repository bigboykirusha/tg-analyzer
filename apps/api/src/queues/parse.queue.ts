import { Queue } from 'bullmq'
import { redis } from '../services/redis.service'

export interface ParseJobData {
  userId: string
  jobId: string
  chatIds?: string[]
}

export const parseDialogsQueue = new Queue<ParseJobData>('parse-dialogs', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 50,
  },
})

export const cleanupQueue = new Queue('cleanup-old-data', {
  connection: redis,
})
