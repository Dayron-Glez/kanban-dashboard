const animate = require("tailwindcss-animate")

/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    safelist: ["dark"],
    prefix: "",
    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
    ],
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            gridTemplateColumns: {
                '16': 'repeat(16, minmax(0, 1fr))',
            },
            gridColumn: {
                'span-15': 'span 15 / span 15',
                'span-16': 'span 16 / span 16'
            },
            // Los colores ahora se manejan desde @theme inline en el CSS
            borderRadius: {
                xl: "calc(var(--radius) + 4px)",
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--reka-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--reka-accordion-content-height)" },
                    to: { height: "0" },
                },
                "collapsible-down": {
                    from: { height: "0" },
                    to: { height: 'var(--reka-collapsible-content-height)' },
                },
                "collapsible-up": {
                    from: { height: 'var(--reka-collapsible-content-height)' },
                    to: { height: "0" },
                },
                "fade-left": {
                    "0%": {
                        opacity: "0",
                        transform: "translateX(2rem)"
                    },
                    "100%": {
                        opacity: "1",
                        transform: "translateX(0)"
                    }
                }
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "collapsible-down": "collapsible-down 0.2s ease-in-out",
                "collapsible-up": "collapsible-up 0.2s ease-in-out",
                "fade-left": "fade-left 0.2s ease"
            },
        },
    },
    plugins: [animate],
}