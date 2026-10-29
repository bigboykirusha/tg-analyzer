import {
  chatIdParamsSchema,
  type ReportDto,
  type ReportSharingDto,
  type ReportsResponse,
  type SuccessResponse,
} from '@tg-analyzer/shared'
import type { FastifyPluginAsync } from 'fastify'
import { parse } from '../../http/validation'
import { notFound } from '../../lib/errors'
import { requireAuth, userIdOf } from '../auth/guard'
import { reportSharing } from '../teams/teams.service'
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

  app.get('/:chatId/sharing', async (request): Promise<ReportSharingDto> => {
    const { chatId } = parse(chatIdParamsSchema, request.params)
    return reportSharing(userIdOf(request), chatId)
  })

  app.delete('/:chatId', async (request): Promise<SuccessResponse> => {
    const { chatId } = parse(chatIdParamsSchema, request.params)
    if (!(await deleteReport(userIdOf(request), chatId))) throw notFound('CHAT_NOT_FOUND', 'Report not found')
    return { success: true }
  })
}
