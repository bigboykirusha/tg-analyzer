/** Keeps a number with its unit on one line: «4 800 сообщений» never breaks after the 800. */
export function nbsp(text: string): string {
  return text.replace(/(\d)[ \t](?=[\p{L}%])/gu, '$1 ')
}
