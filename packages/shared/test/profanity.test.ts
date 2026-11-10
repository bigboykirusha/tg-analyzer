import test from 'node:test'
import assert from 'node:assert/strict'
import { isProfane, maskProfanity, withoutProfanity } from '../src/index.js'

const OBSCENE = [
  'хуй',
  'нахуй',
  'пиздец',
  'ебать',
  'заебал',
  'выебал',
  'въебал',
  'взъебать',
  'изъебаться',
  'подъебал',
  'разъебал',
  'объебал',
  'долбоёб',
  'долбоеб',
  'долбоебизм',
  'мудоёб',
  'охуеть',
  'бляяя',
  'хуууй',
  'ёбаный',
  'сука',
  'мудак',
  'пидор',
  'залупа',
  'дрочить',
  'fuck',
  'motherfucker',
  'shit',
  // Latin look-alikes inside Cyrillic words
  'хyй',
  'xуй',
  'пиздеc',
  'нaхуй',
]

const ORDINARY = [
  'сухую',
  'всухую',
  'насухую',
  'сухой',
  'педикулёз',
  'педиатр',
  'педикюр',
  'хлебать',
  'потребитель',
  'оскорблять',
  'рубль',
  'сабля',
  'психую',
  'психуют',
  'страхуй',
  'небо',
  'себя',
  'веб',
  'хлеб',
  'хулиган',
  'худой',
  'хуже',
  'мудрый',
  'команда',
  'мандарин',
  'бляха',
  'блин',
  'облако',
  'употреблять',
  'суккулент',
  'сукно',
  'двоебрачие',
  'shift',
  'class',
  'assistant',
  'hello',
]

test('obscene words are recognised, with prefixes, compounds and look-alike letters', () => {
  for (const word of OBSCENE) assert.equal(isProfane(word), true, word)
})

test('ordinary words that hide the same letters are not obscene', () => {
  for (const word of ORDINARY) assert.equal(isProfane(word), false, word)
})

test('lists and masks', () => {
  assert.deepEqual(
    withoutProfanity([{ value: 'привет' }, { value: 'долбоёб' }]).map((i) => i.value),
    ['привет'],
  )
  assert.equal(maskProfanity('долбоёб'), 'д**')
  assert.equal(maskProfanity('привет'), 'привет')
})
