/**
 * Word stems, so that «работа», «работы» and «работу» count as one word.
 * Russian follows the Snowball algorithm; English drops plural endings only.
 * Stems are grouping keys: reports show the most frequent written form.
 */

const RU_VOWELS = new Set('аеиоуыэюя')

// Endings marked «after а/я» only count when one of those letters precedes them.
const PERFECTIVE_GERUND_AFTER_A = ['вшись', 'вши', 'в']
const PERFECTIVE_GERUND = ['ившись', 'ывшись', 'ивши', 'ывши', 'ив', 'ыв']
const REFLEXIVE = ['ся', 'сь']
// prettier-ignore
const ADJECTIVE = [
  'ими', 'ыми', 'его', 'ого', 'ему', 'ому', 'ее', 'ие', 'ые', 'ое', 'ей', 'ий', 'ый', 'ой', 'ем', 'им', 'ым',
  'ом', 'их', 'ых', 'ую', 'юю', 'ая', 'яя', 'ою', 'ею',
]
const PARTICIPLE_AFTER_A = ['ем', 'нн', 'вш', 'ющ', 'щ']
const PARTICIPLE = ['ивш', 'ывш', 'ующ']
// prettier-ignore
const VERB_AFTER_A = ['ете', 'йте', 'ешь', 'нно', 'ла', 'на', 'ли', 'ем', 'ло', 'но', 'ет', 'ют', 'ны', 'ть', 'й', 'л', 'н']
// prettier-ignore
const VERB = [
  'ейте', 'уйте', 'ила', 'ыла', 'ена', 'ите', 'или', 'ыли', 'ило', 'ыло', 'ено', 'ует', 'уют', 'ены', 'ить', 'ыть',
  'ишь', 'ей', 'уй', 'ил', 'ыл', 'им', 'ым', 'ен', 'ят', 'ит', 'ыт', 'ую', 'ю',
]
// prettier-ignore
const NOUN = [
  'иями', 'ями', 'ами', 'ией', 'иям', 'ием', 'иях', 'ев', 'ов', 'ие', 'ье', 'еи', 'ии', 'ей', 'ой', 'ий', 'ям',
  'ем', 'ам', 'ом', 'ах', 'ях', 'ию', 'ью', 'ия', 'ья', 'а', 'е', 'и', 'й', 'о', 'у', 'ы', 'ь', 'ю', 'я',
]
const DERIVATIONAL = ['ость', 'ост']
const SUPERLATIVE = ['ейше', 'ейш']

const CYRILLIC_WORD = /^[а-яе-]+$/
const LATIN_WORD = /^[a-z-]+$/

function longest(list: readonly string[]) {
  return [...list].sort((left, right) => right.length - left.length)
}

const SORTED = {
  gerundAfterA: longest(PERFECTIVE_GERUND_AFTER_A),
  gerund: longest(PERFECTIVE_GERUND),
  adjective: longest(ADJECTIVE),
  participleAfterA: longest(PARTICIPLE_AFTER_A),
  participle: longest(PARTICIPLE),
  verbAfterA: longest(VERB_AFTER_A),
  verb: longest(VERB),
  noun: longest(NOUN),
}

/** Removes the longest ending from `list` found within the region that starts at `start`. */
function strip(word: string, start: number, list: readonly string[], afterA = false): string | null {
  for (const ending of list) {
    if (!word.endsWith(ending)) continue
    const cut = word.length - ending.length
    if (cut < start) continue
    if (afterA) {
      const before = word[cut - 1]
      if (cut - 1 < start || (before !== 'а' && before !== 'я')) continue
    }
    return word.slice(0, cut)
  }
  return null
}

/** Either ending class, preferring whichever removes more. */
function stripEither(word: string, start: number, afterA: readonly string[], plain: readonly string[]) {
  const first = strip(word, start, afterA, true)
  const second = strip(word, start, plain)
  if (first === null) return second
  if (second === null) return first
  return first.length <= second.length ? first : second
}

function regionAfterVowelThenConsonant(word: string, from: number) {
  for (let index = from + 1; index < word.length; index += 1) {
    if (!RU_VOWELS.has(word[index]!) && RU_VOWELS.has(word[index - 1]!)) return index + 1
  }
  return word.length
}

export function stemRussian(word: string): string {
  let rv = word.length
  for (let index = 0; index < word.length; index += 1) {
    if (RU_VOWELS.has(word[index]!)) {
      rv = index + 1
      break
    }
  }
  if (rv >= word.length) return word
  const r1 = regionAfterVowelThenConsonant(word, 0)
  const r2 = regionAfterVowelThenConsonant(word, r1)

  // Step 1.
  let stem = stripEither(word, rv, SORTED.gerundAfterA, SORTED.gerund)
  if (stem === null) {
    stem = strip(word, rv, REFLEXIVE) ?? word
    const adjective = strip(stem, rv, SORTED.adjective)
    if (adjective !== null) {
      stem = stripEither(adjective, rv, SORTED.participleAfterA, SORTED.participle) ?? adjective
    } else {
      stem = stripEither(stem, rv, SORTED.verbAfterA, SORTED.verb) ?? strip(stem, rv, SORTED.noun) ?? stem
    }
  }

  // Step 2.
  if (stem.endsWith('и') && stem.length - 1 >= rv) stem = stem.slice(0, -1)

  // Step 3.
  stem = strip(stem, Math.max(r2, rv), DERIVATIONAL) ?? stem

  // Step 4.
  if (stem.endsWith('нн') && stem.length - 2 >= rv) return stem.slice(0, -1)
  const superlative = strip(stem, rv, SUPERLATIVE)
  if (superlative !== null) {
    stem = superlative
    return stem.endsWith('нн') && stem.length - 2 >= rv ? stem.slice(0, -1) : stem
  }
  if (stem.endsWith('ь') && stem.length - 1 >= rv) stem = stem.slice(0, -1)
  return stem
}

/** Plural and possessive endings only: «friends» and «friend» meet, «news» stays. */
export function stemEnglish(word: string): string {
  if (word.length <= 3) return word
  if (word.endsWith("'s")) return word.slice(0, -2)
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`
  if (word.endsWith('s') && !/(?:ss|us|is|ws)$/.test(word)) return word.slice(0, -1)
  return word
}

/** Grouping key of a normalised word; hyphenated and mixed words are kept whole. */
export function stemWord(word: string): string {
  if (word.includes('-')) return word
  // Short words are usually names, slang or abbreviations: stemming them merges too much.
  if (word.length <= 3) return word
  if (CYRILLIC_WORD.test(word)) {
    const stem = stemRussian(word)
    return stem.length >= 2 ? stem : word
  }
  if (LATIN_WORD.test(word)) return stemEnglish(word)
  return word
}
