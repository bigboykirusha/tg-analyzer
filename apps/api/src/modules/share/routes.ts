import {
  answerQuizBodySchema,
  chatIdParamsSchema,
  createShareLinkBodySchema,
  shareLinkParamsSchema,
  shareTokenParamsSchema,
  type PublicShareDto,
  type ShareLinkDto,
  type ShareLinksResponse,
  type SuccessResponse,
  type UserShareLinksResponse,
} from '@tg-analyzer/shared'
import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { parse } from '../../http/validation'
import { notFound } from '../../lib/errors'
import { optionalUserId, requireAuth, userIdOf } from '../auth/guard'
import { answerQuiz, createLink, deleteLink, listLinks, listUserLinks, openLink } from './repository'

/** The owner's links of one report: list, make (or replace), delete. */
export const shareLinkRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  app.get('/:chatId/links', async (request): Promise<ShareLinksResponse> => {
    const { chatId } = parse(chatIdParamsSchema, request.params)
    return listLinks(userIdOf(request), chatId)
  })

  app.post('/:chatId/links', async (request): Promise<ShareLinkDto> => {
    const { chatId } = parse(chatIdParamsSchema, request.params)
    return createLink(userIdOf(request), chatId, parse(createShareLinkBodySchema, request.body))
  })

  app.delete('/:chatId/links/:kind', async (request): Promise<SuccessResponse> => {
    const { chatId, kind } = parse(shareLinkParamsSchema, request.params)
    if (!(await deleteLink(userIdOf(request), chatId, kind))) throw notFound('LINK_NOT_FOUND', 'Link not found')
    return { success: true }
  })
}

/** All the user's links at once, for the home summary. */
export const userLinkRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  app.get('/', async (request): Promise<UserShareLinksResponse> => ({ links: await listUserLinks(userIdOf(request)) }))
}

/** Guessing tokens is pointless at 96 bits, but a page of guesses should still be slow. */
const publicLimit = {
  rateLimit: { max: 60, timeWindow: '1 minute', keyGenerator: (request: FastifyRequest) => `public:${request.ip}` },
}

/** What a link opens, without signing in. */
export const publicShareRoutes: FastifyPluginAsync = async (app) => {
  app.get('/:token', { config: publicLimit }, async (request): Promise<PublicShareDto> => {
    const { token } = parse(shareTokenParamsSchema, request.params)
    return openLink(token, await optionalUserId(request))
  })

  app.post('/:token/answer', { config: publicLimit }, async (request): Promise<PublicShareDto> => {
    const { token } = parse(shareTokenParamsSchema, request.params)
    const { picks, share } = parse(answerQuizBodySchema, request.body)
    return answerQuiz(token, picks, share)
  })
}
