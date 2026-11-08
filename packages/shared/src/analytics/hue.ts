/**
 * The person's colour family, chosen the way Telegram colours a person's avatar: abs(peer id) % 7
 * over red, orange, violet, green, teal, blue and pink (Telegram-iOS, AvatarNode.gradientColors).
 * Returns 1–7. Supergroups and channels drop their «-100» prefix; a non-numeric seed falls back to a
 * stable hash. The web app paints with it, and public links send it, since they hide the chat id.
 */
export function telegramHueIndex(seed: string | number | null | undefined): number {
  const key = String(seed ?? '')
  if (/^-?\d+$/u.test(key)) {
    const value = key.startsWith('-100') ? key.slice(4) : key.replace(/^-/u, '')
    if (value) return Number(BigInt(value) % 7n) + 1
  }
  let hash = 0
  for (let index = 0; index < key.length; index += 1) hash = (hash * 31 + key.charCodeAt(index)) | 0
  return (Math.abs(hash) % 7) + 1
}
