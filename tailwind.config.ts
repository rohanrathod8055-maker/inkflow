import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                "primary": "#1a0b2e",
                "primary-light": "#2d1b4e",
                "accent": "#FF0066",
                "background-dark": "#0A0A0A",
                "surface": "#160f25",
                "surface-highlight": "#231535",
                "text-dim": "#ab9ac1",
            },
            fontFamily: {
                "display": ["Space Grotesk", "sans-serif"],
                "body": ["Manrope", "sans-serif"],
            },
            borderRadius: {
                "DEFAULT": "0.5rem", "lg": "1rem", "xl": "1.5rem", "2xl": "2rem", "full": "9999px"
            },
            boxShadow: {
                "glow": "0 0 20px -5px rgba(255, 0, 102, 0.3)",
                "glow-purple": "0 0 25px -5px rgba(26, 11, 46, 0.6)",
            }
        },
    },
    plugins: [],
};
export default config;
