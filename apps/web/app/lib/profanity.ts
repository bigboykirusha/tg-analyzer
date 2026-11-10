/**
 * Obscene words are recognised in `@tg-analyzer/shared` (one rule for the API, the report, «Итоги» and
 * the link). These names stay for the callers that mask a word instead of dropping it.
 */
export { isProfane as isSwear, maskProfanity as maskSwear } from '@tg-analyzer/shared'
