const WORD_PATTERN = /[\p{L}\p{N}_-]{2,}/gu
const EMOJI_CANDIDATE = /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u
// One emoji sequence: pictograph with optional modifier / variation selector /
// tag sequence, ZWJ-joined pictographs, a regional-indicator flag or a keycap.
const EMOJI_SEQUENCE =
  /\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|️⃣?|[\u{E0020}-\u{E007E}]+\u{E007F})?(?:‍\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|️)?)*|\p{Regional_Indicator}{2}|[#*0-9]️?⃣/gu
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
  'arent', 'wasnt', 'one', 'some', 'any', 'how', 'when', 'where', 'why', 'now', 'like', 'really', 'well',
  'know', 'think', 'going', 'gonna', 'wanna', 'lol', 'lmao', 'haha', 'hahaha', 'oh', 'ah', 'hmm', 'thanks',
  'more', 'much', 'only', 'other', 'out', 'off', 'again', 'still', 'even', 'let', 'see', 'go', 'make',
]

export const DEFAULT_STOP_WORDS: ReadonlySet<string> = new Set([...STOP_WORDS_RU, ...STOP_WORDS_EN])

export interface MessageTextAnalysis {
  /** Every word-like token, stop words included. */
  wordCount: number
  /** Normalised tokens worth counting in vocabulary charts. */
  keywords: string[]
  /** Emoji graphemes, e.g. a family emoji counts once. */
  emojis: string[]
  /** The message asks something. */
  asks: boolean
  /** The message laughs: «ахах», «хаха», «lol», 😂. */
  laughs: boolean
}

/** «ахах», «хахаха», «хех», «lol»; typos such as «ахпхах» are left alone. */
const LAUGH_WORD = /^(?:а?(?:х[аеы])+х?|(?:ха)+|(?:ah)?(?:ha)+h?|(?:he){2,}|lo+l|lmao|лол|ржу|ору)$/u
const SHORT_LAUGHS = new Set(['хех', 'лол', 'lol', 'ору', 'ржу'])
const LAUGH_EMOJI = /😂|🤣|😆|😹/u

/** Laughter tokens are counted as laughs, never as top words. */
export function isLaughter(word: string) {
  return (word.length >= 4 || SHORT_LAUGHS.has(word)) && LAUGH_WORD.test(word)
}

/** Drops stop words from stored top lists, so reports made with an older list read clean too. */
export function withoutStopWords<T extends { value: string }>(
  items: readonly T[],
  stopWords: ReadonlySet<string> = DEFAULT_STOP_WORDS,
): T[] {
  return items.filter((item) => !stopWords.has(item.value) && !isLaughter(item.value))
}

export function analyzeMessageText(
  text: string,
  stopWords: ReadonlySet<string> = DEFAULT_STOP_WORDS,
): MessageTextAnalysis {
  if (!text) return { wordCount: 0, keywords: [], emojis: [], asks: false, laughs: false }

  const words = text.match(WORD_PATTERN) ?? []
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

  return { wordCount: words.length, keywords, emojis, asks: text.includes('?'), laughs }
}

const EDGE_PUNCTUATION = /^[_-]+|[_-]+$/g
const TWO_LETTERS = /\p{L}[^]*\p{L}/u

function normalizeWord(word: string): string | null {
  let normalized = word.toLowerCase()
  if (normalized.includes('ё')) normalized = normalized.replaceAll('ё', 'е')
  if (
    normalized.startsWith('_') ||
    normalized.startsWith('-') ||
    normalized.endsWith('_') ||
    normalized.endsWith('-')
  ) {
    normalized = normalized.replace(EDGE_PUNCTUATION, '')
  }
  // Require at least two letters so that numbers and ids do not dominate.
  return normalized.length >= 2 && TWO_LETTERS.test(normalized) ? normalized : null
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
    if (rendersAsEmoji) emojis.push(sequence)
  }
  return emojis
}
