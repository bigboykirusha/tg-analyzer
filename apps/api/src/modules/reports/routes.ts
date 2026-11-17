import { chatIdParamsSchema, type ReportDto, type ReportsResponse, type SuccessResponse } from '@tg-analyzer/shared'
import type { FastifyPluginAsync } from 'fastify'
import { parse } from '../../http/validation'
import { notFound } from '../../lib/errors'
import { requireAuth, userIdOf } from '../auth/guard'
import { announceCancellation } from '../parse/cancellation'
import { deleteReport, getReport, listReportSummaries } from './repository'

export const reportRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  app.get('/', async (request): Promise<ReportsResponse> => ({
    reports: await listReportSummaries(userIdOf(request)),
  }))

  app.get('/:chatId', async (request): Promise<ReportDto> => {
    const { chatId } = parse(chatIdParamsSchema, request.params)
    const report = await getReport(userIdOf(request), chatId)
    if (!report) throw notFound('CHAT_NOT_FOUND', 'Report not found')
    return report
  })

  app.delete('/:chatId', async (request): Promise<SuccessResponse> => {
    const { chatId } = parse(chatIdParamsSchema, request.params)
    const deleted = await deleteReport(userIdOf(request), chatId)
    if (!deleted) throw notFound('CHAT_NOT_FOUND', 'Report not found')
    if (deleted.cancelledJob) void announceCancellation(deleted.cancelledJob)
    return { success: true }
  })
}
