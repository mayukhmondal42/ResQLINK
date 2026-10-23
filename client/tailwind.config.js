/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        
        console: {
          bg: '#0D0D0D',
          surface: '#161616',
          surfaceAlt: '#202020',
          border: '#333333',
          mist: '#F2F0EE',
          muted: '#9B9B9B',
        },
        
        field: {
          bg: '#F7F4EE',
          surface: '#FFFFFF',
          ink: '#1A1A1A',
          muted: '#6B7280',
        },
        
        severity: {
          critical: '#E8462F',
          high: '#F2994A',
          medium: '#F2C94C',
          low: '#2BB673',
          info: '#3E8EDE',
        },
        brand: {
          DEFAULT: '#A00C30', 
          dark: '#6E081F',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        pulseBeacon: 'pulseBeacon 1.6s ease-in-out infinite',
      },
      keyframes: {
        pulseBeacon: {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.4, transform: 'scale(1.3)' },
        },
      },
    },
  },
  plugins: [],
};
