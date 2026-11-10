/**
 * Obscene language in word lists. Everything that leaves the owner's own screen («Итоги», links,
 * previews) and the report by default is shown without it; the owner can ask for the full version.
 *
 * A word counts only when a known root stands at its start, after at most a few known prefixes
 * («на-хуй», «за-ебал», «вы-ебал»). Roots are never searched inside a word: «страхуй» (страх + уй),
 * «рубля», «хлеба», «употреблять» and «небо» hide the same letters and are ordinary words.
 */

/** Prefixes that may stand before a root: «на», «по», «вы», «разъ»… Several can stack («недо-за-ебал»). */
const PREFIX = String.raw`(?:на|по|за|вы|от|до|при|про|пре|пере|рас|раз|ис|из|об|о|не|ни|под|над|с|в|у|а|ох|ах|ух|съ|объ|подъ|надъ|разъ|отъ|недо)*`
/** The shorter list for the root «еб», where one-letter prefixes would catch «себя» and «веб». */
const PREFIX_EB = String.raw`(?:на|по|за|вы|от|до|при|про|пере|об|у|съ|объ|подъ|надъ|разъ|отъ|недо)*`

const stem = (root: string, prefix = PREFIX) => new RegExp(`^${prefix}(?:${root})`, 'u')

const RUSSIAN: readonly RegExp[] = [
  // хуй, хуе-, хуя-, хую, хуи-; «хуже», «худой», «хулиган», «хутор» do not match.
  stem(String.raw`ху(?:й|е|я|ю|и)`),
  // нах, пох on their own
  /^(?:нах|пох|нихуя|нихера)$/u,
  // хер as a swear: хер, нахер, херня, херово; not «херес», «херувим», «Херсон».
  stem(String.raw`хер(?:$|а$|у$|ом$|е$|н[яюие]|ов|ач|ак|ит|ить|ы$)`),
  // пизд, пздц; no ordinary word holds «пизд»
  /пизд/u,
  /^(?:пздц|пзд|пздец)$/u,
  // еб-: ебал, ебан, ебать, ебу, ебись, ебло, еблан, ебн-; ё is folded to е
  stem(String.raw`еб(?:а|у|и|л|н|ы|ош|ок|к|ет|ешь|ем|ё)`, PREFIX_EB),
  // бля, блять, блядь, блядский; not «бляха», «блин», «облако»
  /^(?:бля|блят[а-я]*|бляд[а-я]*|блеат[а-я]*)$/u,
  // сука, суки, сучара; not «сукно», «сучок», «суккулент»
  /^(?:сука|суку|суке|суки|сукой|сукам|суками|сучка|сучку|сучки|сучке|сучара[а-я]*|сучонок|сучий|сучья|сучье|сукин[а-я]*)$/u,
  // мудак, мудила, мудозвон; not «мудрый», «мудрость»
  stem(String.raw`муд(?:ак|ач|ил|о[збх]|ень|ло)`),
  // манда; not «мандарин», «мандат», «команда»
  /^манд(?:а|ы|е|у|ой|ами|ень|овош[а-я]*)$/u,
  // пидор, пидар, пидрила, педераст; not «педикюр»
  /^пид[оа]р/u,
  /^пидр/u,
  /^педераст/u,
  /^педик(?!юр)/u,
  // залупа, шлюха, гандон/гондон: no ordinary word holds these
  /залуп/u,
  /шлюх/u,
  /^г[ао]ндон/u,
  // дрочить and kin
  stem(String.raw`дроч`),
]

const ENGLISH: readonly RegExp[] = [
  /^(?:mother)?f+u+c?k+(?:ing|er|ers|ed|s|in|head|off|up|tard|wit|boy|face)?$/u,
  /^fck(?:ing|ed|er)?$/u,
  /^(?:bull|horse|dip|dumb|apple)?shit(?:s|ty|ting|head|hole|show|ter)?$/u,
  /^bitch(?:es|y|ing)?$/u,
  /^(?:dumb|bad|jack|smart|fat)?ass(?:es|hole|holes|hat|clown)?$/u,
  /^(?:dick|dicks|dickhead|cock|cocks|pussy|pussies|cunt|cunts|twat|wanker|bastard|bastards|whore|whores|slut|sluts|faggot|faggots|nigger|niggers|nigga|niggas)$/u,
  /^(?:wtf|stfu|motherfucker|mf)$/u,
]

const ALL = [...RUSSIAN, ...ENGLISH]
const cache = new Map<string, boolean>()
const CACHE_LIMIT = 5000

/** Letters only, lower case, ё as е, a stretched vowel («бляяя», «хуууй») squeezed to one. */
function fold(word: string) {
  return word
    .toLowerCase()
    .replaceAll('ё', 'е')
    .replace(/(\p{L})\1{2,}/gu, '$1$1')
    .replace(/([аеиоуыэюя])\1+/gu, '$1')
}

function testWord(word: string) {
  const plain = fold(word)
  if (!plain) return false
  return ALL.some((pattern) => pattern.test(plain))
}

/** Whether a single word is obscene. Hyphenated words are obscene when any part is. */
export function isProfane(word: string): boolean {
  const cached = cache.get(word)
  if (cached !== undefined) return cached
  const found = testWord(word) || (word.includes('-') && word.split('-').some(testWord))
  if (cache.size >= CACHE_LIMIT) cache.clear()
  cache.set(word, found)
  return found
}

/** Drops obscene words from a «top N» list; the others keep their order and counts. */
export function withoutProfanity<T extends { value: string }>(items: readonly T[]): T[] {
  return items.filter((item) => !isProfane(item.value))
}

/** «бля» → «б**»; other words as they are. For places where the word is already chosen. */
export function maskProfanity(word: string): string {
  return isProfane(word) ? `${[...word][0] ?? ''}**` : word
}
