// Injected into a page: returns every distinct value in use, by category, with counts and an example selector.
// Facts only. The root is #__nuxt + #teleports (live app) or .app (mockup).
window.__collect = function collect(rootSel) {
  const out = {}
  const add = (cat, value, el) => {
    if (value === undefined || value === null || value === '') return
    const c = (out[cat] ||= {})
    const v = (c[value] ||= { n: 0, ex: [] })
    v.n++
    if (v.ex.length < 3) {
      const cls = (el.getAttribute('class') || '').split(/\s+/).filter(Boolean).slice(0, 2).join('.')
      const ex = el.tagName.toLowerCase() + (cls ? '.' + cls : '')
      if (!v.ex.includes(ex)) v.ex.push(ex)
    }
  }
  const px = (v) => {
    const n = parseFloat(v)
    return isNaN(n) ? null : Math.round(n * 100) / 100
  }
  const roots = rootSel
    .split(',')
    .map((s) => document.querySelector(s.trim()))
    .filter(Boolean)
  const els = roots.flatMap((r) => [r, ...r.querySelectorAll('*')])
  const skip = (el) => el.closest('.kb, .spec, script, style, head, noscript, [aria-hidden="true"] .kb')
  for (const el of els) {
    if (skip(el)) continue
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') continue
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) continue
    // space
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
      const p = px(cs['padding' + side])
      if (p) add('space.padding', p, el)
      const m = px(cs['margin' + side])
      if (m && m > 0 && m < 400) add('space.margin', m, el)
    }
    if (/flex|grid/.test(cs.display)) {
      const rg = px(cs.rowGap),
        cg = px(cs.columnGap)
      if (rg) add('space.gap', rg, el)
      if (cg && cg !== rg) add('space.gap', cg, el)
    }
    // shape
    const rad = cs.borderTopLeftRadius
    if (rad && rad !== '0px') add('shape.radius', /%/.test(rad) || px(rad) >= 500 ? 'full' : px(rad), el)
    for (const side of ['Top', 'Bottom', 'Left', 'Right']) {
      const w = px(cs['border' + side + 'Width'])
      if (w && cs['border' + side + 'Style'] !== 'none') add('shape.border-width', w, el)
    }
    if (cs.boxShadow && cs.boxShadow !== 'none')
      add(
        'shape.shadow',
        cs.boxShadow.replace(/rgba?\([^)]*\)/g, (c) => c.replace(/\s/g, '')),
        el,
      )
    if (cs.backdropFilter && cs.backdropFilter !== 'none') add('shape.backdrop', cs.backdropFilter, el)
    // sizes
    const tag = el.tagName.toLowerCase()
    const interactive = el.matches(
      'button, a.btn, [class*="btn"], input, select, textarea, [role="switch"], [role="tab"], [role="radio"]',
    )
    if (interactive && r.height > 0) add('size.control-height', Math.round(r.height), el)
    if (tag === 'svg' && el.closest('button, a, li, span, p, div') && r.width <= 48)
      add('size.icon', `${Math.round(r.width)}×${Math.round(r.height)}`, el)
    if (/avatar|(^|\s)av(\s|$)/.test(el.getAttribute('class') || '') && Math.abs(r.width - r.height) < 1)
      add('size.avatar', Math.round(r.width), el)
    if (tag === 'svg') {
      const sw = el.getAttribute('stroke-width') || cs.strokeWidth
      if (sw && sw !== '1px' && sw !== '0px') add('icon.stroke', sw, el)
    }
    // type
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
    if (hasText) {
      add('type.size', px(cs.fontSize), el)
      add(
        'type.style',
        `${px(cs.fontSize)}/${cs.lineHeight === 'normal' ? 'normal' : px(cs.lineHeight)} ${cs.fontWeight} ls:${cs.letterSpacing}`,
        el,
      )
      add('type.weight', cs.fontWeight, el)
      add('type.family', cs.fontFamily.split(',')[0].replace(/["']/g, ''), el)
      add('color.text', cs.color, el)
    }
    // colour
    if (cs.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor))
      add('color.background', cs.backgroundColor, el)
    if (cs.backgroundImage && cs.backgroundImage !== 'none') add('color.gradient', cs.backgroundImage.slice(0, 120), el)
    if (px(cs.borderTopWidth) && cs.borderTopStyle !== 'none') add('color.border', cs.borderTopColor, el)
    // motion
    if (cs.transitionDuration && cs.transitionDuration !== '0s') {
      add('motion.duration', cs.transitionDuration, el)
      add('motion.easing', cs.transitionTimingFunction.slice(0, 80), el)
      add('motion.property', cs.transitionProperty.slice(0, 80), el)
    }
    if (cs.animationName && cs.animationName !== 'none')
      add('motion.animation', `${cs.animationName} ${cs.animationDuration}`, el)
  }
  return out
}
