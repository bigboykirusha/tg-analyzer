import {
  chatIdParamsSchema,
  shareReportQuerySchema,
  type ReportDto,
  type ReportsResponse,
  type SuccessResponse,
} from '@tg-analyzer/shared'
import type { FastifyPluginAsync } from 'fastify'
import { parse } from '../../http/validation'
import { badRequest, notFound } from '../../lib/errors'
import { withUserTelegram } from '../account/telegram-access'
import { requireAuth, userIdOf } from '../auth/guard'
import { deleteReport, getReport, listReportSummaries } from './repository'

const MAX_PDF_BYTES = 20 * 1024 * 1024

export const reportRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  // Exported PDFs are uploaded as raw bytes rather than base64-encoded JSON.
  app.addContentTypeParser('application/pdf', { parseAs: 'buffer', bodyLimit: MAX_PDF_BYTES }, (_request, body, done) =>
    done(null, body),
  )

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
    if (!(await deleteReport(userIdOf(request), chatId))) throw notFound('CHAT_NOT_FOUND', 'Report not found')
    return { success: true }
  })

  /** Sends an exported report to the user's own Saved Messages. */
  app.post('/:chatId/share', { bodyLimit: MAX_PDF_BYTES }, async (request): Promise<SuccessResponse> => {
    parse(chatIdParamsSchema, request.params)
    const { fileName } = parse(shareReportQuerySchema, request.query)
    const data = request.body
    if (!Buffer.isBuffer(data) || data.subarray(0, 5).toString('latin1') !== '%PDF-') {
      throw badRequest('Expected a PDF document')
    }

    await withUserTelegram(userIdOf(request), (api) => api.sendDocumentToSavedMessages({ name: fileName, data }), {
      waitMs: 10_000,
    })
    return { success: true }
  })
}
