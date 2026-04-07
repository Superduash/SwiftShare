/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary':  '#08090D',
        'bg-card':     '#0D0F18',
        'bg-elevated': '#12141F',
        'accent-cyan':   '#22D3EE',
        'accent-purple': '#6366F1',
        'accent-green':  '#34D399',
        'accent-red':    '#F87171',
        'accent-yellow': '#FBBF24',
        'accent-orange': '#FB923C',
        'text-primary': '#ECEEF5',
        'text-muted':   '#8B90AA',
        'text-dim':     '#4A4E65',
        'border-color': '#1C1E2E',
      },
      fontFamily: {
        sans:    ['Satoshi', 'Inter', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
        display: ['Satoshi', 'Inter', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.04em',
        tighter:  '-0.03em',
        tight:    '-0.02em',
        snug:     '-0.01em',
      },
      borderRadius: {
        DEFAULT: '12px',
        lg: '18px',
        xl: '24px',
      },
      boxShadow: {
        'glow':          '0 0 24px rgba(99,102,241,0.18)',
        'glow-strong':   '0 0 48px rgba(99,102,241,0.30)',
        'glow-cyan':     '0 0 20px rgba(34,211,238,0.12)',
        'glow-green':    '0 0 20px rgba(52,211,153,0.20)',
        'glow-red':      '0 0 20px rgba(248,113,113,0.20)',
      },
    },
  },
  plugins: [],
}
