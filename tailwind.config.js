/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#16A34A', // Vibrant Green from logo
          secondary: '#15803D', // Darker Green
          light: '#F0FDF4', // Very light green background
          accent: '#FACC15', // Yellow for "Buy" and "Easy" vibe
          peach: '#FDBA74', // From mascot ears
          charcoal: '#111827', // For text and scooter details
        },
        green: {
          primary: '#16A34A',
          dark: '#15803D',
          light: '#4ADE80',
          lighter: '#DCFCE7',
          darkest: '#14532D',
        },
        offwhite: {
          DEFAULT: '#FAFAFA',
          light: '#FFFFFF',
        }
      },
      fontFamily: {
        'brand': ['Outfit', 'system-ui', 'sans-serif'],
        'soft': ['Quicksand', 'sans-serif'],
        'outfit': ['Outfit', 'sans-serif']
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'bounce-gentle': 'bounceGentle 0.6s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        bounceGentle: {
          '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-4px)' },
          '60%': { transform: 'translateY(-2px)' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        }
      }
    },
  },
  plugins: [],
};