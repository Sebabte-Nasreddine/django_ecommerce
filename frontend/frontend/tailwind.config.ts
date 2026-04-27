import type { Config } from 'tailwindcss'

const config: Config = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './lib/**/*.{js,ts,jsx,tsx}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#f9f9f9',
                    100: '#f2f2f2',
                    200: '#e5e5e5',
                    300: '#d4d4d4',
                    400: '#a3a3a3',
                    500: '#1a1a1a',  // Luxury Charcoal/Black
                    600: '#111111',
                    700: '#0a0a0a',
                    800: '#050505',
                    900: '#000000',
                    950: '#000000',
                },
                surface: {
                    DEFAULT: '#F5F5F3', // Bone
                    50: '#FFFFFF',      // White
                    100: '#EAEAE8',     // Muted Bone
                },
                accent: {
                    DEFAULT: '#C5A059', // Subtle Gold/Brass
                }
            },
            fontFamily: {
                sans:  ['Inter', 'system-ui', 'sans-serif'],
                serif: ['Playfair Display', 'Georgia', 'serif'],
            },
            letterSpacing: {
                'extra-wide': '0.15em',
                'luxury':     '0.25em',
            },
            animation: {
                'fade-in': 'fadeIn 0.6s ease-out',
                'slide-up': 'slideUp 0.6s ease-out',
                'slide-in-r': 'slideInRight 0.5s ease-out',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
                slideUp: { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
                slideInRight: { from: { opacity: '0', transform: 'translateX(20px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
            },
            backgroundImage: {
                'hero-gradient': 'linear-gradient(to bottom, #F5F5F3 0%, #FFFFFF 100%)',
                'brand-gradient': 'linear-gradient(135deg, #1A1A1A 0%, #000000 100%)',
                'subtle-shine': 'linear-gradient(45deg, transparent 25%, rgba(255,255,255,0.1) 50%, transparent 75%)',
            },
        },
    },
    plugins: [],
}

export default config
