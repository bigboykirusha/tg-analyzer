export interface PhoneCountry {
  code: string
  flag: string
  dialCode: string
  pattern: number[]
  minDigits: number
  maxDigits: number
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: 'RU', flag: '🇷🇺', dialCode: '+7', pattern: [3, 3, 2, 2], minDigits: 10, maxDigits: 10 },
  { code: 'KZ', flag: '🇰🇿', dialCode: '+7', pattern: [3, 3, 2, 2], minDigits: 10, maxDigits: 10 },
  { code: 'AM', flag: '🇦🇲', dialCode: '+374', pattern: [2, 3, 3], minDigits: 8, maxDigits: 8 },
  { code: 'GE', flag: '🇬🇪', dialCode: '+995', pattern: [3, 2, 2, 2], minDigits: 9, maxDigits: 9 },
  { code: 'BY', flag: '🇧🇾', dialCode: '+375', pattern: [2, 3, 2, 2], minDigits: 9, maxDigits: 9 },
  { code: 'UA', flag: '🇺🇦', dialCode: '+380', pattern: [2, 3, 2, 2], minDigits: 9, maxDigits: 9 },
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

  return groups.join(' ')
}

export function usePhoneInput(initialCountry = 'RU') {
  const countryCode = ref(initialCountry)
  const nationalDigits = ref('')

  const country = computed<PhoneCountry>(() => PHONE_COUNTRIES.find((item) => item.code === countryCode.value) ?? DEFAULT_COUNTRY)

  const displayValue = computed({
    get() {
      return formatGroups(nationalDigits.value, country.value.pattern)
    },
    set(value: string) {
      nationalDigits.value = trimToPattern(value, country.value)
    },
  })

  const normalizedPhone = computed(() => `${country.value.dialCode}${nationalDigits.value}`)

  const isValid = computed(() => (
    nationalDigits.value.length >= country.value.minDigits
    && nationalDigits.value.length <= country.value.maxDigits
  ))

  function setCountry(nextCode: string) {
    countryCode.value = nextCode
    nationalDigits.value = trimToPattern(nationalDigits.value, country.value)
  }

  function setFromNormalized(value: string) {
    const digits = onlyDigits(value)
    const match = [...PHONE_COUNTRIES]
      .sort((left, right) => right.dialCode.length - left.dialCode.length)
      .find((item) => digits.startsWith(onlyDigits(item.dialCode)))

    if (!match) {
      countryCode.value = DEFAULT_COUNTRY.code
      nationalDigits.value = trimToPattern(digits, DEFAULT_COUNTRY)
      return
    }

    countryCode.value = match.code
    nationalDigits.value = digits.slice(onlyDigits(match.dialCode).length, onlyDigits(match.dialCode).length + match.maxDigits)
  }

  return {
    countryCode,
    country,
    countries: PHONE_COUNTRIES,
    displayValue,
    normalizedPhone,
    isValid,
    setCountry,
    setFromNormalized,
  }
}
