import emojiRegex from 'emoji-regex'

// A word, with an apostrophe inside it («don't», «д'Артаньян») kept whole.
const WORD_PATTERN = /[\p{L}\p{N}_-]+(?:['’][\p{L}]+)*/gu
const HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u
const APOSTROPHES = /['’]/gu
const EMOJI_CANDIDATE = /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u
// One emoji per match, as the Unicode standard defines them (ZWJ families, flags, keycaps, skin tones).
const EMOJI_SEQUENCE = emojiRegex()
// One emoji sequence: pictograph with optional modifier / variation selector /
// tag sequence, ZWJ-joined pictographs, a regional-indicator flag or a keycap.
const EMOJI_PRESENTATION = /^\p{Emoji_Presentation}/u
const TEXT_PRESENTATION = '︎'

// prettier-ignore
const STOP_WORDS_RU = [
  'и', 'в', 'не', 'на', 'я', 'что', 'тот', 'это', 'с', 'он', 'как', 'по', 'но', 'они', 'к', 'из', 'у', 'за',
  'то', 'же', 'от', 'так', 'а', 'да', 'ну', 'вот', 'уже', 'ещё', 'еще', 'бы', 'ли', 'до', 'со', 'мне', 'ты',
  'мы', 'вы', 'она', 'оно', 'об', 'её', 'ее', 'его', 'их', 'ей', 'им', 'нас', 'вас', 'нет', 'был', 'была',
  'были', 'быть', 'есть', 'буду', 'всё', 'все', 'или', 'если', 'когда', 'чтобы', 'потому', 'этот', 'эта',
  'эти', 'при', 'без', 'под', 'над', 'для', 'про', 'меня', 'тебя', 'него', 'неё', 'нее', 'них', 'себя', 'там',
  'тут', 'где', 'куда', 'мой', 'твой', 'свой', 'наш', 'ваш', 'чем', 'можно', 'надо', 'нужно', 'только',
  'вообще', 'просто', 'очень', 'тоже', 'зато', 'хотя', 'пока', 'потом', 'после', 'перед', 'между', 'через',
  'здесь', 'туда', 'оттуда', 'ведь', 'даже', 'лишь', 'именно', 'разве', 'неужели', 'вдруг', 'тебе',
  'ему', 'ним', 'кто', 'какой', 'какая', 'какие', 'сейчас', 'тогда', 'ага', 'угу',
  // Other forms of pronouns and determiners.
  'мной', 'мною', 'тобой', 'нам', 'вам', 'нами', 'вами', 'ими', 'нему', 'нею', 'ней', 'нём', 'нем', 'него',
  'себе', 'собой', 'этого', 'этому', 'этим', 'этом', 'этой', 'эту', 'этих', 'этими', 'того', 'тому', 'том',
  'той', 'ту', 'те', 'тех', 'теми', 'моя', 'мое', 'моё', 'мои', 'моего', 'моей', 'моих', 'твоя', 'твое', 'твоё',
  'твои', 'твоего', 'твоей', 'твоих', 'свою', 'своей', 'своих', 'наша', 'наше', 'наши', 'нашей', 'наших',
  'ваша', 'ваше', 'ваши', 'вашей', 'ваших', 'который', 'которая', 'которое', 'которые', 'которого', 'которой',
  'которых', 'чего', 'чему', 'чём', 'кого', 'кому', 'весь', 'вся', 'всего', 'всей', 'всем', 'всех', 'сам',
  'сама', 'само', 'сами', 'самый', 'такой', 'такая', 'такое', 'такие', 'таких', 'каждый', 'другой', 'другие',
  // Verbs and words that carry no topic.
  'будет', 'будут', 'будешь', 'будем', 'было', 'будто', 'может', 'могу', 'можешь', 'мог', 'могла', 'хочу',
  'хочешь', 'хотел', 'хотела', 'знаю', 'знаешь', 'думаю', 'кажется', 'давай', 'давайте', 'стал', 'стала',
  'нибудь', 'либо', 'тоесть', 'значит', 'кстати', 'наверное', 'наверно', 'конечно', 'вроде', 'типа', 'типо',
  'короче', 'кароче', 'вообщем', 'щас', 'ща', 'че', 'чё', 'чо', 'чего', 'чет', 'чёт', 'что-то', 'как-то',
  'где-то', 'кто-то', 'какой-то', 'какая-то', 'какие-то', 'когда-то', 'почему-то', 'что-нибудь', 'вон',
  'почему', 'зачем', 'как', 'так', 'там', 'опять', 'снова', 'больше', 'меньше', 'много', 'мало',
  'сильно', 'совсем', 'почти', 'точно', 'правда', 'реально', 'норм', 'ок', 'окей', 'ладно', 'хорошо',
  'привет', 'пока', 'да-да', 'нет-нет', 'ну-ну', 'неа', 'ой', 'ах', 'ох', 'эх', 'хм', 'мм', 'ммм', 'ааа',
  'аа', 'ее', 'её', 'один', 'одна', 'одно', 'два', 'три', 'раз', 'день', 'сегодня', 'завтра', 'вчера',
  // Forms that slip past older lemma-less reports: speech and thinking verbs, linking adverbs.
  'говорю', 'говорит', 'говоришь', 'говорил', 'говорила', 'сказал', 'сказала', 'сказали', 'скажу', 'сказать',
  'видел', 'видела', 'такого', 'такую', 'такой-то', 'поэтому', 'также', 'потому-что', 'че-то', 'чё-то', 'чето',
  'щас-то', 'делать', 'сделать', 'лучше', 'первый', 'первая', 'первое', 'пишет', 'пишу', 'написал', 'написала',
  // Greetings are counted as rituals, not as topics.
  'доброе', 'доброго', 'добрым', 'доброй', 'спокойной', 'споки',
]

// prettier-ignore
const STOP_WORDS_EN = [
  'i', 'me', 'my', 'myself', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they',
  'them', 'their', 'what', 'which', 'who', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were',
  'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
  'might', 'shall', 'can', 'need', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'an',
  'the', 'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'not', 'no', 'if', 'then', 'than', 'too',
  'very', 'just', 'because', 'while', 'though', 'since', 'until', 'unless', 'also', 'about', 'up', 'out',
  'into', 'over', 'after', 'before', 'ok', 'okay', 'yes', 'yeah', 'yep', 'nope', 'hey', 'hi', 'im',
  'dont', 'there', 'here', 'all', 'get', 'got',
  'im', 'ive', 'id', 'ill', 'youre', 'its', 'thats', 'whats', 'cant', 'wont', 'didnt', 'doesnt', 'isnt',
  'arent', 'wasnt', 'werent', 'havent', 'hasnt', 'hadnt', 'wouldnt', 'couldnt', 'shouldnt', 'aint', 'lets',
  'theyre', 'theyve', 'theyll', 'weve', 'youve', 'youll', 'hes', 'shes', 'theres', 'heres', 'whos', 'wheres', 'one', 'some', 'any', 'how', 'when', 'where', 'why', 'now', 'like', 'really', 'well',
  'know', 'think', 'going', 'gonna', 'wanna', 'lol', 'lmao', 'haha', 'hahaha', 'oh', 'ah', 'hmm', 'thanks',
  'more', 'much', 'only', 'other', 'out', 'off', 'again', 'still', 'even', 'let', 'see', 'go', 'make',
]

// prettier-ignore
/**
 * Dictionary forms that carry no topic however they are spelled: «сказала» and
 * «скажу» are both «сказать». Checked after lemmatisation, so every form drops out.
 */
export const STOP_LEMMAS: ReadonlySet<string> = new Set([
  'говорить', 'сказать', 'писать', 'написать', 'спросить', 'спрашивать', 'ответить', 'отвечать', 'знать',
  'думать', 'подумать', 'понять', 'понимать', 'казаться', 'делать', 'сделать', 'мочь', 'хотеть', 'стать',
  'видеть', 'увидеть', 'быть', 'есть', 'иметь', 'хороший', 'поэтому', 'потому', 'также', 'сейчас', 'потом',
  'такой', 'какой', 'этот', 'тот', 'весь', 'сам', 'самый', 'один', 'первый', 'второй', 'другой', 'каждый',
])

export const DEFAULT_STOP_WORDS: ReadonlySet<string> = new Set([...STOP_WORDS_RU, ...STOP_WORDS_EN])

export interface MessageTextAnalysis {
  /** Every word-like token, stop words included. Links and @mentions are not words. */
  wordCount: number
  /** Normalised tokens worth counting in vocabulary charts. */
  keywords: string[]
  /** Emoji graphemes, e.g. a family emoji counts once; skin tones are merged. */
  emojis: string[]
  /** The message asks something. */
  asks: boolean
  /** The message laughs: «ахах», «хаха», «lol», 😂. */
  laughs: boolean
  /** A good-morning or good-night wish. */
  greeting: 'morning' | 'night' | null
}

const EMPTY_ANALYSIS: MessageTextAnalysis = {
  wordCount: 0,
  keywords: [],
  emojis: [],
  asks: false,
  laughs: false,
  greeting: null,
}

/** «ахах», «хахаха», «хех», «lol», «азаза»; typos such as «ахпхах» count too. */
const LAUGH_WORD = /^(?:а?(?:х[аеы])+х?|(?:ха)+|(?:ah)?(?:ha)+h?|(?:he){2,}|lo+l|lmao|lmfao|rofl|лол|ржу|ору)$/u
/** Laughs typed in a hurry mix neighbouring keys: «ахпххаз», «хвхвх», «азазаз». */
const SLOPPY_LAUGH = /^[ахпзвыъж]+$/u
const SHORT_LAUGHS = new Set(['хех', 'хах', 'лол', 'lol', 'ору', 'ржу', 'кек', 'хд', 'xd', 'хдд', 'xdd'])
const LAUGH_EMOJI = /😂|🤣|😆|😹/u

function count(word: string, letter: string) {
  let total = 0
  for (const char of word) if (char === letter) total += 1
  return total
}

/** Laughter tokens are counted as laughs, never as top words. */
export function isLaughter(word: string) {
  if (SHORT_LAUGHS.has(word)) return true
  if (word.length < 4) return false
  if (LAUGH_WORD.test(word)) return true
  if (/^(?:аз)+а?$/u.test(word) || /^(?:пх)+п?$/u.test(word)) return true
  // At least two «х» and a vowel, from letters next to each other on the keyboard.
  return SLOPPY_LAUGH.test(word) && count(word, 'х') >= 2 && /[аы]/u.test(word) && !/(.)\1\1/u.test(word)
}

/** Drops stop words from stored top lists, so reports made with an older list read clean too. */
export function withoutStopWords<T extends { value: string }>(
  items: readonly T[],
  stopWords: ReadonlySet<string> = DEFAULT_STOP_WORDS,
): T[] {
  return items.filter((item) => !stopWords.has(item.value) && !isLaughter(item.value))
}

/** Links, e-mail addresses, @mentions and /commands carry no words of the conversation. */
const NOT_WORDS =
  /(?:https?:\/\/|www\.)\S+|\b[\w.+-]+@[\w-]+\.[\w.-]+|(?:^|\s)[@/][\w@]+|\b[\w-]+\.(?:com|ru|org|net|io|me|app|рф|be|ly|tv|gg)(?:\/\S*)?/giu

// Wishes and bare questions are matched on lower-cased text with ё folded and repeated letters squeezed to one.
const GOOD_MORNING =
  /(?:^|[^\p{L}])(?:(?:с\s*)?добр(?:ое|ого|ым)\s*утр(?:о|ом|а|ечко|ечка|ечком)?|утр(?:о|а)\s+добр(?:ое|ого)|утречк[оа]|go{1,2}d\s*morning|g'?morning|gm)(?![\p{L}])/iu
/** «Утро!» on its own is a greeting, while «до утра» is not. */
const BARE_MORNING = /^(?:всем\s+)?(?:утро|утрецо|morning)[^\p{L}\p{N}]*$/iu
const GOOD_NIGHT =
  /(?:^|[^\p{L}])(?:спокойн(?:ой|енькой)\s*ночи|споки(?:\s*ноки)?|спок\s*ночи|спокиноки|сладких\s+снов|добрых\s+снов|доброй\s+ночи|go{1,2}d\s*night|nighty?\s*night|gn|(?:иду|пошл[аи]|пошел|ушл[аи]|ушел|ложусь)\s+спать)(?![\p{L}])/iu

/** Questions people type without a question mark. */
const BARE_QUESTION =
  /^(?:а\s+)?(?:(?:ты|вы)\s+(?:где|тут|здесь|дома|спишь|занят[аы]?|свободн[аы]?|можешь|придешь|будешь|едешь)|где\s+(?:ты|вы)|как\s+(?:дела|ты|вы|сам[аи]?|настроение|прошло|оно|там|себя\s+чувствуешь)|(?:что|чем|че|чо|шо)\s+(?:делаешь|делаете|занят[аы]?|нового)|(?:не\s+)?спишь|how\s+are\s+you|how\s+r\s+u|where\s+are\s+you|what'?s\s+up|wyd|you\s+there)(?![\p{L}])/iu

/** «спасибоооо» → «спасибо», «класссс» → «класс», «дааа» → «да». */
const STRETCHED_VOWEL = /([аеиоуыэюяaeiouy])\1{2,}/giu
const STRETCHED_CONSONANT = /(\p{L})\1{2,}/gu

const REPEATED_LETTER = /(\p{L})\1+/gu

export function squeezeStretched(text: string) {
  return text.replace(STRETCHED_VOWEL, '$1').replace(STRETCHED_CONSONANT, '$1$1')
}

export function analyzeMessageText(
  text: string,
  stopWords: ReadonlySet<string> = DEFAULT_STOP_WORDS,
): MessageTextAnalysis {
  if (!text) return { ...EMPTY_ANALYSIS, keywords: [], emojis: [] }

  const prose = NOT_WORDS.test(text) ? text.replace(NOT_WORDS, ' ') : text
  NOT_WORDS.lastIndex = 0
  const words = (prose.match(WORD_PATTERN) ?? []).filter((word) => HAS_LETTER_OR_DIGIT.test(word))
  const keywords: string[] = []
  let laughs = false
  for (const word of words) {
    const normalized = normalizeWord(word)
    if (!normalized) continue
    if (isLaughter(normalized)) laughs = true
    else if (!stopWords.has(normalized)) keywords.push(normalized)
  }
  const emojis = extractEmojis(text)
  if (!laughs && emojis.length) laughs = emojis.some((symbol) => LAUGH_EMOJI.test(symbol))

  const plain = prose.toLowerCase().replaceAll('ё', 'е').replace(REPEATED_LETTER, '$1').trim()
  const asks = prose.includes('?') || BARE_QUESTION.test(plain)
  const greeting = GOOD_NIGHT.test(plain)
    ? 'night'
    : GOOD_MORNING.test(plain) || BARE_MORNING.test(plain)
      ? 'morning'
      : null

  return { wordCount: words.length, keywords, emojis, asks, laughs, greeting }
}

const EDGE_PUNCTUATION = /^[_-]+|[_-]+$/g
const TWO_LETTERS = /\p{L}[^]*\p{L}/u

function normalizeWord(word: string): string | null {
  let normalized = word.toLowerCase().replace(APOSTROPHES, '')
  if (normalized.includes('ё')) normalized = normalized.replaceAll('ё', 'е')
  if (
    normalized.startsWith('_') ||
    normalized.startsWith('-') ||
    normalized.endsWith('_') ||
    normalized.endsWith('-')
  ) {
    normalized = normalized.replace(EDGE_PUNCTUATION, '')
  }
  normalized = squeezeStretched(normalized)
  // Require at least two letters so that numbers and ids do not dominate.
  return normalized.length >= 2 && TWO_LETTERS.test(normalized) ? normalized : null
}

const SKIN_TONE = /[\u{1F3FB}-\u{1F3FF}]/gu
const VARIATION_SELECTOR = '\u{FE0F}'

/** One key per emoji: skin tones merge, and a symbol always carries the emoji selector. */
export function normalizeEmoji(symbol: string) {
  const plain = symbol.replace(SKIN_TONE, '')
  if (!plain) return symbol
  const bare = plain.replaceAll(VARIATION_SELECTOR, '')
  // A lone symbol such as ❤ renders as text without the selector.
  if ([...bare].length === 1 && !EMOJI_PRESENTATION.test(bare)) return `${bare}${VARIATION_SELECTOR}`
  return plain.includes('\u{200D}') || plain.includes('\u{20E3}') ? plain : bare || plain
}

function extractEmojis(text: string): string[] {
  // Cheap pre-check: most messages contain no emoji at all.
  if (!EMOJI_CANDIDATE.test(text)) return []

  const emojis: string[] = []
  for (const match of text.matchAll(EMOJI_SEQUENCE)) {
    const sequence = match[0]
    const next = text[match.index + sequence.length]
    // Pictographs such as ♥ or ☆ are plain symbols unless rendered as emoji.
    const rendersAsEmoji =
      next !== TEXT_PRESENTATION && (sequence.length > 2 || sequence.includes('️') || EMOJI_PRESENTATION.test(sequence))
    if (rendersAsEmoji) emojis.push(normalizeEmoji(sequence))
  }
  return emojis
}
