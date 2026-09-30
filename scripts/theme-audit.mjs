import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendDir = path.resolve(__dirname, '..')

// Color contrast utilities
function parseHexOrRgba(colorStr) {
  if (!colorStr) return null
  const clean = colorStr.trim()
  if (clean.startsWith('#')) {
    let hex = clean.slice(1)
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('')
    }
    const num = parseInt(hex, 16)
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
      a: 1,
    }
  }
  const match = clean.match(/rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)/)
  if (match) {
    return {
      r: parseFloat(match[1]),
      g: parseFloat(match[2]),
      b: parseFloat(match[3]),
      a: match[4] !== undefined ? parseFloat(match[4]) : 1,
    }
  }
  return null
}

function luminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const val = c / 255
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function contrastRatio(c1, c2) {
  const col1 = parseHexOrRgba(c1)
  const col2 = parseHexOrRgba(c2)
  if (!col1 || !col2) return 1

  // Composite col1 over col2 if col1 has alpha
  const r1 = col1.r * col1.a + col2.r * (1 - col1.a)
  const g1 = col1.g * col1.a + col2.g * (1 - col1.a)
  const b1 = col1.b * col1.a + col2.b * (1 - col1.a)

  const lum1 = luminance(r1, g1, b1)
  const lum2 = luminance(col2.r, col2.g, col2.b)

  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)
  return (lighter + 0.05) / (darker + 0.05)
}

function parseCssThemes(cssContent) {
  const themeBlocks = {}
  const regex = /\[data-theme="([a-zA-Z0-9-]+)"\]\s*\{([^}]+)\}/g
  let match
  while ((match = regex.exec(cssContent)) !== null) {
    const themeId = match[1]
    const blockContent = match[2]
    const tokens = {}
    const tokenRegex = /(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g
    let tokenMatch
    while ((tokenMatch = tokenRegex.exec(blockContent)) !== null) {
      tokens[tokenMatch[1].trim()] = tokenMatch[2].trim()
    }
    themeBlocks[themeId] = tokens
  }
  return themeBlocks
}

async function runAudit() {
  console.log('\n=== SWIFTSHARE THEME AUDIT (12 Themes) ===\n')

  let hasErrors = false

  // 1. Read registry
  const registryPath = path.join(frontendDir, 'src/theme/theme-registry.json')
  if (!fs.existsSync(registryPath)) {
    console.error('❌ Missing theme-registry.json')
    process.exit(1)
  }
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'))
  const registryThemeIds = registry.themes.map(t => t.id)

  if (registry.themes.length !== 12) {
    console.error(`❌ Expected 12 themes in registry, found ${registry.themes.length}`)
    hasErrors = true
  }

  // 2. Parse CSS files
  const cssPremiumPath = path.join(frontendDir, 'src/themes-premium.css')
  const cssCinematicPath = path.join(frontendDir, 'src/themes-cinematic.css')
  const premiumCss = fs.readFileSync(cssPremiumPath, 'utf-8')
  const cinematicCss = fs.readFileSync(cssCinematicPath, 'utf-8')

  const parsedThemes = {
    ...parseCssThemes(premiumCss),
    ...parseCssThemes(cinematicCss),
  }

  const cssThemeIds = Object.keys(parsedThemes)
  console.log(`Found ${cssThemeIds.length} CSS theme declarations: ${cssThemeIds.join(', ')}`)

  for (const id of registryThemeIds) {
    if (!parsedThemes[id]) {
      console.error(`❌ CSS missing block for registry theme '${id}'`)
      hasErrors = true
    }
  }

  // 3. Token symmetry assertion
  const allTokenKeys = new Set()
  Object.values(parsedThemes).forEach(tokens => {
    Object.keys(tokens).forEach(k => allTokenKeys.add(k))
  })

  const tokenList = Array.from(allTokenKeys).sort()
  console.log(`Total canonical tokens per theme: ${tokenList.length}`)

  for (const [id, tokens] of Object.entries(parsedThemes)) {
    const missing = tokenList.filter(k => !(k in tokens))
    if (missing.length > 0) {
      console.error(`❌ Theme '${id}' missing ${missing.length} token(s): ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}`)
      hasErrors = true
    }
  }

  // 4. Contrast checks table
  console.log('\n--- Contrast & Accessibility Audit ---')
  console.log('Theme          Mode   text/bg (>=7)  text-2/bg (>=4.5)  accent-text/bg (>=4.5)  on-accent (>=4.5)  input-border (>=3)')
  console.log('----------------------------------------------------------------------------------------------------------------')

  for (const regTheme of registry.themes) {
    const id = regTheme.id
    const t = parsedThemes[id]
    if (!t) continue

    const crTextBg = contrastRatio(t['--text'], t['--bg'])
    const crText2Bg = contrastRatio(t['--text-2'], t['--bg'])
    const crAccentText = contrastRatio(t['--accent-text'], t['--bg'])
    const crOnAccent = contrastRatio(t['--on-accent'], t['--accent-fill'])
    const crInputBorder = contrastRatio(t['--input-border'], t['--bg'])

    const failText = crTextBg < 7
    const failText2 = crText2Bg < 4.5
    const failAccentText = crAccentText < 4.5
    const failOnAccent = crOnAccent < 4.5
    const isNew = ['lilac', 'mint', 'ember'].includes(id)
    const failBorder = crInputBorder < 3

    if (failText || failText2 || failAccentText || failOnAccent || (isNew && failBorder)) {
      hasErrors = true
    }

    const fmt = (val, pass) => `${pass ? '✓' : '✗'} ${val.toFixed(2).padStart(5)}:1`
    console.log(
      `${id.padEnd(14)} ${regTheme.mode.padEnd(6)} ` +
      `${fmt(crTextBg, !failText)}   ` +
      `${fmt(crText2Bg, !failText2)}      ` +
      `${fmt(crAccentText, !failAccentText)}          ` +
      `${fmt(crOnAccent, !failOnAccent)}       ` +
      `${fmt(crInputBorder, !failBorder)}`
    )
  }

  if (hasErrors) {
    console.error('\n❌ Theme audit FAILED. See errors above.\n')
    process.exit(1)
  } else {
    console.log('\n✓ All 12 themes passed registry symmetry and WCAG contrast checks!\n')
  }
}

runAudit().catch(err => {
  console.error(err)
  process.exit(1)
})
