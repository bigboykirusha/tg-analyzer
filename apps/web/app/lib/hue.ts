/**
 * The person's colour: one of seven hues, chosen the way Telegram colours a person's avatar —
 * abs(peer id) % 7 over red, orange, violet, green, teal (Telegram's cyan), blue and pink
 * (Telegram-iOS, AvatarNode.gradientColors). So the colour a person wears here is the family they
 * already wear in Telegram. The avatar, the report's poster and room, the other side's marks in
 * charts and the stories all use it (tokens.css, «per person»).
 */
import { telegramHueIndex } from '@tg-analyzer/shared'

export const HUES = ['red', 'orange', 'violet', 'green', 'teal', 'blue', 'pink'] as const
export type Hue = (typeof HUES)[number]

/** 1–7, the index of `--avatar-N-bg`. Non-numeric seeds (a name, the example) fall back to a hash. */
export function hueIndex(seed: string | number | null | undefined): number {
  return telegramHueIndex(seed)
}

/** The hue named by its index, as public links send it (they hide the chat id). */
export function hueAt(index: number): Hue {
  return HUES[(index - 1 + HUES.length) % HUES.length]!
}

export function hueOf(seed: string | number | null | undefined): Hue {
  return HUES[hueIndex(seed) - 1]!
}
