/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        brand: {
          50: '#FFF7F0',
          100: '#FFEDE0',
          200: '#FFD4B8',
          300: '#FFB88A',
          400: '#FF9A5C',
          500: '#E8634A',
          600: '#D14A33',
          700: '#B03424',
          800: '#8C2418',
          900: '#6B1A10',
        },
        warm: {
          50: '#FFFCF9',
          100: '#FFF8F1',
          200: '#FFF1E4',
          300: '#FFE8D3',
          400: '#F5D5B8',
          500: '#D4B896',
          600: '#B39B7A',
          700: '#8C7A62',
          800: '#665A49',
          900: '#3D3630',
        },
        ink: {
          50: '#F8F6F4',
          100: '#EBE7E2',
          200: '#D4CEC6',
          300: '#B5ADA2',
          400: '#8E8477',
          500: '#6B6155',
          600: '#504840',
          700: '#3A342E',
          800: '#262220',
          900: '#181614',
        },
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '28px',
      },
      boxShadow: {
        soft: '0 2px 16px rgba(0,0,0,0.04), 0 1px 4px rgba(0,0,0,0.03)',
        medium: '0 4px 24px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
        lift: '0 8px 40px rgba(0,0,0,0.08), 0 2px 12px rgba(0,0,0,0.04)',
        glow: '0 0 0 3px rgba(232,99,74,0.15), 0 4px 24px rgba(232,99,74,0.1)',
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'shake': 'shake 0.4s ease-in-out',
        'spring-in': 'springIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(100%)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        springIn: {
          from: { opacity: '0', transform: 'scale(0.8)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
