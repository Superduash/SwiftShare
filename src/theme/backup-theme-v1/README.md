# Legacy Theme System Backup (v0.7.9 and earlier)

This directory serves as the official backup of the legacy 9-theme system before the v0.8.0 upgrade.

## Legacy Theme List
- Dark Themes (6): `sunset`, `dark`, `midnight`, `lavender`, `forest`, `volcanic`
- Light Themes (3): `sunrise`, `light`, `sakura`

## Legacy Theme Pairs Mapping
```javascript
export const THEME_PAIRS = {
  sunset: 'sunrise',
  sunrise: 'sunset',
  dark: 'light',
  light: 'dark',
  midnight: 'sakura',
  sakura: 'midnight',
  lavender: 'sakura',
  forest: 'sunrise',
  volcanic: 'sunrise',
}
```

## Legacy Storage Keys
- `swiftshare_theme`: stored JSON string of the active theme (e.g. `"sunset"`)
- `swiftshare_theme_mode`: `"dark"` | `"light"`
- `swiftshare_settings.randomTheme`: boolean

## Legacy Swatch Colors
```json
[
  { "value": "sunset", "label": "Sunset", "color": "#C85A10", "light": false },
  { "value": "sunrise", "label": "Sunrise", "color": "#F07020", "light": true },
  { "value": "dark", "label": "Dark", "color": "#1A1A1E", "light": false },
  { "value": "light", "label": "Light", "color": "#F0F0F2", "light": true },
  { "value": "midnight", "label": "Midnight", "color": "#1440A0", "light": false },
  { "value": "sakura", "label": "Sakura", "color": "#F472B6", "light": true },
  { "value": "lavender", "label": "Lavender", "color": "#A78BFA", "light": false },
  { "value": "forest", "label": "Forest", "color": "#00D87C", "light": false },
  { "value": "volcanic", "label": "Volcanic", "color": "#CC1010", "light": false }
]
```
