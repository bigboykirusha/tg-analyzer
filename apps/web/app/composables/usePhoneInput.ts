export interface PhoneCountry {
  code: string
  flag: string
  dialCode: string
  pattern: number[]
  minDigits: number
  maxDigits: number
}

/** Most of our people sign in from these four, so they lead the list. */
export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: 'RU', flag: '🇷🇺', dialCode: '+7', pattern: [3, 3, 2, 2], minDigits: 10, maxDigits: 10 },
  { code: 'UA', flag: '🇺🇦', dialCode: '+380', pattern: [2, 3, 2, 2], minDigits: 9, maxDigits: 9 },
  { code: 'BY', flag: '🇧🇾', dialCode: '+375', pattern: [2, 3, 2, 2], minDigits: 9, maxDigits: 9 },
  { code: 'KZ', flag: '🇰🇿', dialCode: '+7', pattern: [3, 3, 2, 2], minDigits: 10, maxDigits: 10 },
  { code: 'AM', flag: '🇦🇲', dialCode: '+374', pattern: [2, 3, 3], minDigits: 8, maxDigits: 8 },
  { code: 'GE', flag: '🇬🇪', dialCode: '+995', pattern: [3, 2, 2, 2], minDigits: 9, maxDigits: 9 },
  { code: 'US', flag: '🇺🇸', dialCode: '+1', pattern: [3, 3, 4], minDigits: 10, maxDigits: 10 },
  { code: 'GB', flag: '🇬🇧', dialCode: '+44', pattern: [4, 3, 4], minDigits: 10, maxDigits: 11 },
  { code: 'DE', flag: '🇩🇪', dialCode: '+49', pattern: [3, 3, 4], minDigits: 10, maxDigits: 11 },
  { code: 'PL', flag: '🇵🇱', dialCode: '+48', pattern: [3, 3, 3], minDigits: 9, maxDigits: 9 },
  { code: 'TR', flag: '🇹🇷', dialCode: '+90', pattern: [3, 3, 2, 2], minDigits: 10, maxDigits: 10 },
  { code: 'AE', flag: '🇦🇪', dialCode: '+971', pattern: [2, 3, 4], minDigits: 9, maxDigits: 9 },
  { code: 'IL', flag: '🇮🇱', dialCode: '+972', pattern: [2, 3, 4], minDigits: 9, maxDigits: 9 },
  { code: 'IN', flag: '🇮🇳', dialCode: '+91', pattern: [5, 5], minDigits: 10, maxDigits: 10 },
]

const DEFAULT_COUNTRY = PHONE_COUNTRIES[0]!

const ZONE_COUNTRY: Record<string, string> = {
  'Europe/Kyiv': 'UA',
  'Europe/Kiev': 'UA',
  'Europe/Uzhgorod': 'UA',
  'Europe/Zaporozhye': 'UA',
  'Europe/Minsk': 'BY',
  'Asia/Almaty': 'KZ',
  'Asia/Qostanay': 'KZ',
  'Asia/Aqtobe': 'KZ',
  'Asia/Aqtau': 'KZ',
  'Asia/Atyrau': 'KZ',
  'Asia/Oral': 'KZ',
  'Asia/Qyzylorda': 'KZ',
}
const LANGUAGE_COUNTRY: Record<string, string> = { uk: 'UA', be: 'BY', kk: 'KZ', ru: 'RU' }

/**
 * The country whose code the phone field starts with: the time zone says where the person is,
 * the browser language helps when the zone is shared. Anything else starts with Russia.
 */
export function detectPhoneCountry(languages: readonly string[], timeZone: string | undefined) {
  const byZone = timeZone ? ZONE_COUNTRY[timeZone] : undefined
  if (byZone) return byZone
  for (const language of languages) {
    const [base = '', region = ''] = language.toLowerCase().split('-')
    const byRegion = PHONE_COUNTRIES.find((country) => country.code === region.toUpperCase())
    if (base === 'ru' && byRegion && ['UA', 'BY', 'KZ'].includes(byRegion.code)) return byRegion.code
    const byLanguage = LANGUAGE_COUNTRY[base]
    if (byLanguage) return byLanguage
  }
  return DEFAULT_COUNTRY.code
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

function trimToPattern(value: string, country: PhoneCountry) {
  return onlyDigits(value).slice(0, country.maxDigits)
}

function formatGroups(digits: string, pattern: number[]) {
  const firstGroup = pattern[0] ?? 0
  if (!firstGroup) {
    return digits
  }

  const restPattern = pattern.slice(1)
  const groups: string[] = []
  let cursor = 0

  const firstPart = digits.slice(0, firstGroup)
  if (firstPart) {
    groups.push(`(${firstPart}`)
    cursor += firstPart.length

    if (firstPart.length === firstGroup) {
      groups[0] = `${groups[0]})`
    }
  }

  for (const size of restPattern) {
    const part = digits.slice(cursor, cursor + size)
    if (!part) {
      break
    }
    groups.push(part)
    cursor += size
  }
  // Some numbering plans allow an extra digit beyond the usual grouping.
  if (cursor < digits.length) groups[groups.length - 1] += digits.slice(cursor)

  return groups.join(' ')
}

/** «+995599914935» as «+995 599 91 49 35»; anything unrecognised is returned as it came. */
export function formatPhoneNumber(normalized: string) {
  const digits = onlyDigits(normalized)
  const sorted = [...PHONE_COUNTRIES].sort((left, right) => right.dialCode.length - left.dialCode.length)
  let match = sorted.find((item) => digits.startsWith(onlyDigits(item.dialCode)))
  if (match?.dialCode === '+7' && /^7[67]/.test(digits)) match = PHONE_COUNTRIES.find((item) => item.code === 'KZ')
  if (!match) return normalized
  const start = onlyDigits(match.dialCode).length
  const national = digits.slice(start, start + match.maxDigits)
  const groups: string[] = []
  let cursor = 0
  for (const size of match.pattern) {
    const part = national.slice(cursor, cursor + size)
    if (!part) break
    groups.push(part)
    cursor += size
  }
  if (cursor < national.length) groups.push(national.slice(cursor))
  return [match.dialCode, ...groups].join(' ')
}

export function usePhoneInput(initialCountry = 'RU') {
  const countryCode = ref(initialCountry)
  const nationalDigits = ref('')

  const country = computed<PhoneCountry>(
    () => PHONE_COUNTRIES.find((item) => item.code === countryCode.value) ?? DEFAULT_COUNTRY,
  )

  const displayValue = computed({
    get() {
      return formatGroups(nationalDigits.value, country.value.pattern)
    },
    set(value: string) {
      nationalDigits.value = trimToPattern(value, country.value)
    },
  })

  const normalizedPhone = computed(() => `${country.value.dialCode}${nationalDigits.value}`)
  const maxDisplayLength = computed(() => {
    const { pattern } = country.value
    if (!pattern.length) {
      return country.value.maxDigits
    }

    const spaces = Math.max(0, pattern.length - 1)
    const parentheses = pattern[0] ? 2 : 0
    return country.value.maxDigits + spaces + parentheses
  })

  const isValid = computed(
    () =>
      nationalDigits.value.length >= country.value.minDigits && nationalDigits.value.length <= country.value.maxDigits,
  )

  function setCountry(nextCode: string) {
    countryCode.value = nextCode
    nationalDigits.value = trimToPattern(nationalDigits.value, country.value)
  }

  function setFromNormalized(value: string) {
    const digits = onlyDigits(value)
    const sorted = [...PHONE_COUNTRIES].sort((left, right) => right.dialCode.length - left.dialCode.length)
    let match = sorted.find((item) => digits.startsWith(onlyDigits(item.dialCode)))
    // +7 is shared: Kazakhstan numbers start with 6 or 7 after the code, Russian ones never do.
    if (match?.dialCode === '+7')
      match = /^7[67]/.test(digits) ? PHONE_COUNTRIES.find((item) => item.code === 'KZ') : match

    if (!match) {
      countryCode.value = DEFAULT_COUNTRY.code
      nationalDigits.value = trimToPattern(digits, DEFAULT_COUNTRY)
      return
    }

    countryCode.value = match.code
    nationalDigits.value = digits.slice(
      onlyDigits(match.dialCode).length,
      onlyDigits(match.dialCode).length + match.maxDigits,
    )
  }

  return {
    countryCode,
    country,
    countries: PHONE_COUNTRIES,
    displayValue,
    normalizedPhone,
    maxDisplayLength,
    isValid,
    setCountry,
    setFromNormalized,
  }
}
