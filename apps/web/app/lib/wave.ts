/** A drawn pulse for places that show the sign without anyone's data (the landing, a quiz invitation). */
export const wave = (seed: number, length: number) =>
  Array.from({ length }, (_, index) => ({
    sent: 4 + Math.round(6 * Math.abs(Math.sin(index * 0.42 + seed)) + 3 * Math.abs(Math.sin(index * 1.7 + seed * 2))),
    received:
      4 + Math.round(6 * Math.abs(Math.sin(index * 0.37 + seed + 1)) + 3 * Math.abs(Math.cos(index * 1.3 + seed))),
  }))
