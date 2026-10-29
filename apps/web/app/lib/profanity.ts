/**
 * Russian and English swear words, so «Итоги» can show «б**» instead: the
 * pictures get posted to stories, the report itself stays as written.
 */
const SWEAR = [
  /^бл[яэ]/u,
  /х[уy][йяеёию]/u,
  /пизд/u,
  /^(?:за|у|на|вы|по|от|до|при|съ|подъ|разъ|об|въ|о)?[её]б[аиуолн]/u,
  /^сук[аиу]?$/u,
  /^муда[кч]/u,
  /^пид[оа]р/u,
  /^залуп/u,
  /^гандон/u,
  /^шлюх/u,
  /^f+u+c+k/u,
  /^shit/u,
  /^bitch/u,
]

export function isSwear(word: string) {
  const lower = word.toLowerCase().replaceAll('ё', 'е')
  return SWEAR.some((pattern) => pattern.test(lower) || pattern.test(word.toLowerCase()))
}

/** «бля» → «б**»; other words as they are. */
export function maskSwear(word: string) {
  return isSwear(word) ? `${[...word][0] ?? ''}**` : word
}
