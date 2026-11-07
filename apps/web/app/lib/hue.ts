/**
 * The person's colour: one of six hues, picked by a stable hash of the chat id. The avatar, the
 * report's poster and room, the other side's marks in charts and the stories all use the same hue,
 * so a person is recognisable by colour everywhere (tokens.css, «per person»).
 */
export const HUES = ['violet', 'orange', 'green', 'blue', 'pink', 'teal'] as const
export type Hue = (typeof HUES)[number]

/** 1–6, the same index the avatar tones use (`--avatar-N-bg`). */
export function hueIndex(seed: string | number | null | undefined): number {
  const key = String(seed ?? '')
  let hash = 0
  for (let index = 0; index < key.length; index += 1) hash = (hash * 31 + key.charCodeAt(index)) | 0
  return (Math.abs(hash) % HUES.length) + 1
}

export function hueOf(seed: string | number | null | undefined): Hue {
  return HUES[hueIndex(seed) - 1]!
}
