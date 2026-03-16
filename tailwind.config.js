export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#22c55e",
                "background-light": "#fbfaf9",
                "background-dark": "#1a1c1e",
                "glass-white": "rgba(255, 255, 255, 0.65)",
                "glass-border": "rgba(255, 255, 255, 0.4)",
            },
            fontFamily: {
                "display": ["Manrope", "sans-serif"],
                "kanit": ["Kanit", "sans-serif"]
            },
            borderRadius: {
                "lg": "1rem",
                "xl": "1.5rem"
            },
        },
    },
    plugins: [],
}
