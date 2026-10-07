const wordPattern = /[\p{L}\p{N}_-]{2,}/gu
const emojiPresentationPattern = /\p{Emoji_Presentation}/u
const extendedPictographicPattern = /\p{Extended_Pictographic}/u
const keycapPattern = /[#*0-9]\uFE0F?\u20E3/u
const flagPattern = /[\u{1F1E6}-\u{1F1FF}]{2}/u

export interface MessageTextAnalysis {
  wordCount: number
  keywords: string[]
  emojis: string[]
}

export function analyzeMessageText(text: string, stopWords: ReadonlySet<string>): MessageTextAnalysis {
  const words = text.match(wordPattern) ?? []
  const keywords = words.flatMap((word) => {
    const normalized = normalizeWordToken(word)
    return normalized && !stopWords.has(normalized) ? [normalized] : []
  })

  return {
    wordCount: words.length,
    keywords,
    emojis: [...new Intl.Segmenter('und', { granularity: 'grapheme' }).segment(text)]
      .map(({ segment }) => segment)
      .filter(isEmojiGrapheme),
  }
}

function normalizeWordToken(word: string): string | null {
  const normalized = word.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
  if (!normalized || normalized.length < 2) return null

  const lettersOnly = normalized.replace(/[\p{N}_-]/gu, '')
  return lettersOnly.length >= 2 ? normalized : null
}

function isEmojiGrapheme(segment: string): boolean {
  if (segment.includes('\uFE0E')) return false

  return (
    emojiPresentationPattern.test(segment) ||
    segment.includes('\uFE0F') ||
    keycapPattern.test(segment) ||
    flagPattern.test(segment) ||
    (segment.includes('\u200D') && extendedPictographicPattern.test(segment))
  )
}
