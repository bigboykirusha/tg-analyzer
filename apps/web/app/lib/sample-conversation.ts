/**
 * A made-up conversation for illustrations (sign-in page, empty states):
 * deterministic, so the picture is the same on the server and in the browser.
 */
export function sampleConversationDays(count = 120, seed = 7) {
  let state = seed
  const random = () => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }
  return Array.from({ length: count }, (_, index) => {
    // Weekly rhythm, a slow swell in the middle and the odd quiet day.
    const weekly = index % 7 === 5 || index % 7 === 6 ? 0.6 : 1
    const swell = 0.55 + 0.45 * Math.sin((index / count) * Math.PI)
    const quiet = random() < 0.12 ? 0 : 1
    // Most days are ordinary; now and then a long evening talk.
    const burst = random() < 0.1 ? 2.4 : 1
    const base = 40 * weekly * swell * quiet * burst
    const lean = 0.5 + random() * 0.6
    return {
      sent: Math.round(base * lean * random() ** 1.6),
      received: Math.round(base * (1.6 - lean) * random() ** 1.6),
    }
  })
}
