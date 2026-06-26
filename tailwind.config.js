/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./FrontEnd/**/*.{js,ts,jsx,tsx}", // Changed from ./src/ to ./FrontEnd/
    ],
    theme: {
        extend: {
            colors: {
                bgDark: 'hsl(260, 50%, 5%)',
                panelBg: 'rgba(22, 14, 38, 0.6)',
                cyanAccent: 'hsl(182, 100%, 50%)',
                purpleAccent: 'hsl(271, 75%, 60%)',
                blueAccent: 'hsl(208, 99%, 60%)',
                textSecondary: 'hsl(260, 20%, 75%)',
            },
            animation: {
                'spin-slow': 'spin 8s linear infinite',
                'pulse-ring-1': 'pulse-ring 2.4s infinite cubic-bezier(0.215, 0.610, 0.355, 1)',
                'pulse-ring-2': 'pulse-ring 2.4s infinite cubic-bezier(0.215, 0.610, 0.355, 1) 0.8s',
                'pulse-ring-3': 'pulse-ring 2.4s infinite cubic-bezier(0.215, 0.610, 0.355, 1) 1.6s',
            },
            keyframes: {
                'pulse-ring': {
                    '0%': { transform: 'scale(0.95)', opacity: '0.5' },
                    '100%': { transform: 'scale(1.75)', opacity: '0' },
                }
            }
        },
    },
    plugins: [],
}
