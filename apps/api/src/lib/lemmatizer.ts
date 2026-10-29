import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { stemWord, type WordKey } from '@tg-analyzer/shared'
import { logger } from './logger'

/**
 * Russian lemmas from the OpenCorpora dictionary (Az.js, the JavaScript port
 * of pymorphy2): «люблю» and «любит» both count as «любить». Words the
 * dictionary does not know (slang, names, typos) fall back to the Snowball stem.
 */

interface AzParse {
  parser: string
  score: number
  tag: { POST?: string; Apro?: boolean; Anum?: boolean }
  normalize(): { word: string }
}

interface AzModule {
  Morph: ((word: string) => AzParse[]) & { init(path: string, callback: (error?: unknown) => void): void }
}

const require = createRequire(import.meta.url)

/** Parts of speech that carry no topic: pronouns, prepositions, conjunctions, particles, numerals. */
const FUNCTION_WORDS = new Set(['NPRO', 'PREP', 'CONJ', 'PRCL', 'PRED', 'NUMR'])
/** When parses tie, the reading people mean more often in chat wins: «пошла» is a verb, not «пошлый». */
const PREFERENCE = ['NOUN', 'VERB', 'INFN', 'ADJF', 'ADJS', 'ADVB', 'COMP', 'PRTF', 'PRTS', 'GRND', 'INTJ']
const CYRILLIC = /^[а-я-]+$/
const CACHE_LIMIT = 200_000
const TIE = 0.01

let ready: Promise<AzModule | null> | null = null

function load(): Promise<AzModule | null> {
  ready ??= new Promise((resolve) => {
    try {
      const az = require('az') as AzModule
      const dicts = join(dirname(require.resolve('az/package.json')), 'dicts')
      az.Morph.init(dicts, (error) => {
        if (error) {
          logger.warn({ err: error }, 'the Russian dictionary did not load; words are stemmed instead')
          resolve(null)
        } else resolve(az)
      })
    } catch (error) {
      logger.warn({ err: error }, 'the Russian dictionary is missing; words are stemmed instead')
      resolve(null)
    }
  })
  return ready
}

function rank(post: string | undefined) {
  const index = post ? PREFERENCE.indexOf(post) : -1
  return index === -1 ? PREFERENCE.length : index
}

export function lemmaOf(az: AzModule, word: string): string | null {
  if (!CYRILLIC.test(word) || word.includes('-')) return stemWord(word)
  const known = az.Morph(word).filter((parse) => parse.parser === 'Dictionary')
  if (!known.length) return stemWord(word)

  const best = known[0]!.score
  const chosen = known
    .filter((parse) => parse.score >= best - TIE)
    .sort((left, right) => rank(left.tag.POST) - rank(right.tag.POST))[0]!
  if (chosen.tag.POST && FUNCTION_WORDS.has(chosen.tag.POST)) return null
  // «такой», «весь», «этот» and «первый», «второй» are adjectives by form but say nothing about a topic.
  if (chosen.tag.Apro || chosen.tag.Anum) return null
  return chosen.normalize().word.replaceAll('ё', 'е')
}

/** A {@link WordKey} for one analysis; falls back to stemming if the dictionary cannot load. */
export async function createLemmatizer(): Promise<WordKey> {
  const az = await load()
  if (!az) return stemWord
  const cache = new Map<string, string | null>()
  return (word) => {
    const cached = cache.get(word)
    if (cached !== undefined) return cached
    const lemma = lemmaOf(az, word)
    if (cache.size < CACHE_LIMIT) cache.set(word, lemma)
    return lemma
  }
}
