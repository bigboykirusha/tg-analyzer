// Design-system guardrails for apps/web (docs/design-system.md, docs/DESIGN-AUDIT-2026-11-07.md §4 step 6).
// Prettier owns formatting, so there is no stylistic preset here: every rule below protects a token.

const TOKENS_FILE = 'apps/web/app/assets/styles/tokens.css'
const BASE_FILE = 'apps/web/app/assets/styles/base.css'
const ILLUSTRATIONS = [
  'apps/web/app/components/landing/PhoneMockup.vue',
  'apps/web/app/components/landing/ProductWindow.vue',
]
const STORY = ['apps/web/app/components/report/StorySlide.vue', 'apps/web/app/components/report/ReportStory.vue']

// declaration-strict-value splits a value by spaces and checks every item on its own; var(--…) items
// always pass. Each entry below is one more allowed item ("/regex/" or an exact string).

const WIDE = ['inherit', 'initial', 'unset', 'revert']
const CURRENT_COLOR = '/^currentcolor$/i'
// "var(--a)," — an item of a comma-separated list (box-shadow, durations).
const VAR_IN_LIST = String.raw`/^var\(--[\w-]+\),$/`
// calc()/min()/max()/clamp() built from a token, e.g. calc(var(--z-header) - 1).
const MATH_WITH_VAR = String.raw`/^(calc|min|max|clamp)\(.*var\(--.*\)$/`
const CQMIN = String.raw`/^-?\d*\.?\d+cqmin,?$/`

const COLOR_PROPS = [
  'color',
  'background',
  'background-color',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'fill',
  'stroke',
  'outline-color',
  'text-decoration-color',
  'caret-color',
  'box-shadow',
]
const TYPE_PROPS = ['font', 'font-family', 'font-size', 'letter-spacing']
const SHAPE_PROPS = ['border-radius', 'z-index', 'transition-duration', 'animation-duration']
const SPACE_PROPS = ['margin', 'padding', 'gap', 'row-gap', 'column-gap'].flatMap((prop) =>
  prop.endsWith('gap')
    ? [prop]
    : [
        prop,
        ...[
          'top',
          'right',
          'bottom',
          'left',
          'block',
          'block-start',
          'block-end',
          'inline',
          'inline-start',
          'inline-end',
        ].map((side) => `${prop}-${side}`),
      ],
)
const ALL_PROPS = [...COLOR_PROPS, ...TYPE_PROPS, ...SHAPE_PROPS, ...SPACE_PROPS]

const DURATION = ['0s', '0ms', ...WIDE, VAR_IN_LIST]

/** Allowed non-token items per property. */
const ALLOWED = {
  ...Object.fromEntries(COLOR_PROPS.map((prop) => [prop, ['none', 'transparent', CURRENT_COLOR, ...WIDE]])),
  // Shadows and rings are tokens as a whole (--shadow-*, --ring-*, --focus-ring*).
  'box-shadow': ['none', ...WIDE, VAR_IN_LIST],
  font: WIDE,
  'font-family': WIDE,
  'font-size': WIDE,
  'letter-spacing': ['0', 'normal', ...WIDE],
  'border-radius': ['0', ...WIDE, MATH_WITH_VAR],
  'z-index': ['auto', '-1', '0', '1', ...WIDE, MATH_WITH_VAR],
  'transition-duration': DURATION,
  'animation-duration': DURATION,
  // Spacing: --space-* tokens, 0, a 1px hairline, auto, percentages; calc()/min()/max()/env() pass as functions.
  ...Object.fromEntries(
    SPACE_PROPS.map((prop) => [prop, ['0', '1px', '-1px', 'auto', String.raw`/^-?\d*\.?\d+%$/`, ...WIDE]]),
  ),
}

/**
 * Options for `scale-unlimited/declaration-strict-value`. `extra` adds allowed items per property,
 * so a file override widens one property without copying the rest.
 */
const strictValue = ({ props = ALL_PROPS, extra = {} } = {}) => [
  props,
  {
    ignoreVariables: true,
    // A bare rgb()/hsl() is never a token. Functions pass only where a token sits inside them:
    // gradients in `background`, math in spacing. Radius and z-index use MATH_WITH_VAR instead.
    ignoreFunctions: Object.fromEntries(
      props.map((prop) => [prop, prop === 'background' || SPACE_PROPS.includes(prop)]),
    ),
    ignoreValues: Object.fromEntries(props.map((prop) => [prop, [...ALLOWED[prop], ...(extra[prop] ?? [])]])),
    disableFix: true,
    message: 'Use a token for "${property}": "${value}" is not var(--…) or an allowed keyword (docs/design-system.md).',
  },
]

// Raw durations inside transition/animation shorthands: use var(--duration-*) or var(--transition-*).
const RAW_TIME = String.raw`/(^|[\s,(])(?!0m?s\b)\d*\.?\d+m?s\b/`

const FONT_WEIGHTS = ['400', '500', '600', 'inherit', 'normal', String.raw`/^var\(--[\w-]+\)$/`]

// Raw colour functions outside tokens.css; color-mix is banned everywhere.
const COLOR_FUNCTIONS = ['color-mix', 'rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color']

const MEDIA_WIDTHS = ['340px', '640px', '641px', '900px', '901px', '1024px', '1100px', '1200px', '1600px']
const MEDIA_HEIGHTS = ['560px', '620px']

/** @type {import('stylelint').Config} */
export default {
  plugins: ['stylelint-declaration-strict-value'],
  ignoreFiles: ['**/node_modules/**', '**/.nuxt/**', '**/.output/**', '**/dist/**'],
  reportNeedlessDisables: true,
  reportInvalidScopeDisables: true,
  rules: {
    'scale-unlimited/declaration-strict-value': strictValue(),
    'declaration-property-value-allowed-list': { 'font-weight': FONT_WEIGHTS },
    'declaration-property-value-disallowed-list': {
      '/^(transition|animation)$/': [RAW_TIME],
      // Text sizes are the seven roles (--text-*) or a bare --size-*: no computed fractions of anything
      // (that is how avatars once got 9.6, 12.8 and 25.6 px).
      '/^font(-size)?$/': [String.raw`/calc\(/`, String.raw`/\d(em|rem)\b/`],
    },
    'function-disallowed-list': COLOR_FUNCTIONS,
    'color-no-hex': true,
    'color-named': 'never',
    'media-feature-name-value-allowed-list': {
      '/^(min-|max-)?width$/': MEDIA_WIDTHS,
      '/^(min-|max-)?height$/': MEDIA_HEIGHTS,
    },
  },
  overrides: [
    {
      files: ['**/*.vue'],
      customSyntax: 'postcss-html',
    },
    {
      // The palette itself: the only place raw colours and sizes live. color-mix stays banned.
      files: [TOKENS_FILE],
      rules: {
        'scale-unlimited/declaration-strict-value': null,
        'color-no-hex': null,
        'color-named': null,
        'function-disallowed-list': ['color-mix'],
      },
    },
    {
      // §9: touch inputs stay at 16px, otherwise iOS zooms the page.
      // prefers-reduced-motion collapses every animation to 1ms.
      files: [BASE_FILE],
      rules: {
        'scale-unlimited/declaration-strict-value': strictValue({
          extra: { 'font-size': ['16px'], 'transition-duration': ['1ms'], 'animation-duration': ['1ms'] },
        }),
      },
    },
    {
      // §9: landing illustrations draw a device (frame radii and shadows, iOS status bar in 600 and
      // the system font). Only colours stay strict.
      files: ILLUSTRATIONS,
      rules: {
        'scale-unlimited/declaration-strict-value': strictValue({
          props: COLOR_PROPS.filter((prop) => prop !== 'box-shadow'),
        }),
        'declaration-property-value-allowed-list': { 'font-weight': [...FONT_WEIGHTS] },
        'declaration-property-value-disallowed-list': null,
      },
    },
    {
      // §9: «Итоги» scale with the slide and export as 1080×1920, so sizes are in cqmin.
      files: STORY,
      rules: {
        'scale-unlimited/declaration-strict-value': strictValue({
          extra: {
            'font-size': [CQMIN],
            'letter-spacing': [CQMIN, String.raw`/^-?\d*\.?\d+em$/`],
            'border-radius': [CQMIN],
            'box-shadow': ['0', 'inset', CQMIN],
            ...Object.fromEntries(SPACE_PROPS.map((prop) => [prop, [CQMIN]])),
          },
        }),
      },
    },
  ],
}
