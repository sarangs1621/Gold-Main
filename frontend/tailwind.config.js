/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: '#065F46',
          foreground: '#FFFFFF',
          hover: '#047857'
        },
        secondary: {
          DEFAULT: '#F3F4F6',
          foreground: '#1F2937'
        },
        accent: {
          DEFAULT: '#C5A059',
          foreground: '#FFFFFF'
        },
        muted: {
          DEFAULT: '#F1F5F9',
          foreground: '#64748B'
        },
        destructive: {
          DEFAULT: '#991B1B',
          foreground: '#FFFFFF'
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#1F2937'
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#1F2937'
        }
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
}
