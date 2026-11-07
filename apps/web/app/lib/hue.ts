/**
 * The person's colour: one of seven hues, chosen the way Telegram colours a person's avatar —
 * abs(peer id) % 7 over red, orange, violet, green, teal (Telegram's cyan), blue and pink
 * (Telegram-iOS, AvatarNode.gradientColors). So the colour a person wears here is the family they
 * already wear in Telegram. The avatar, the report's poster and room, the other side's marks in
 * charts and the stories all use it (tokens.css, «per person»).
 */
export const HUES = ['red', 'orange', 'violet', 'green', 'teal', 'blue', 'pink'] as const
export type Hue = (typeof HUES)[number]

/** Telegram's own id for a peer: supergroups and channels drop their «-100» prefix. */
function peerNumber(seed: string): bigint | null {
  if (!/^-?\d+$/u.test(seed)) return null
  const value = seed.startsWith('-100') ? seed.slice(4) : seed.replace(/^-/u, '')
  return value ? BigInt(value) : null
}

/** 1–7, the index of `--avatar-N-bg`. Non-numeric seeds (a name, the example) fall back to a hash. */
export function hueIndex(seed: string | number | null | undefined): number {
  const key = String(seed ?? '')
  const peer = peerNumber(key)
  if (peer !== null) return Number(peer % BigInt(HUES.length)) + 1
  let hash = 0
  for (let index = 0; index < key.length; index += 1) hash = (hash * 31 + key.charCodeAt(index)) | 0
  return (Math.abs(hash) % HUES.length) + 1
}

export function hueOf(seed: string | number | null | undefined): Hue {
  return HUES[hueIndex(seed) - 1]!
}
