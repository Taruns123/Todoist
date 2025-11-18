import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        night: "#01060f",
        aurora: "#00f0ff",
        "aurora-soft": "#59f3ff",
        "deep-teal": "#052a36",
        void: "#020211",
        slatepulse: "#0b1e2f",
      },
      fontFamily: {
        display: [
          "var(--font-display)",
          "var(--font-geist-sans)",
          "sans-serif",
        ],
      },
      boxShadow: {
        neon: "0 0 25px rgba(0, 255, 255, 0.18)",
        halo: "0 0 60px rgba(0, 255, 195, 0.25)",
      },
      backgroundImage: {
        "grid-glow":
          "radial-gradient(circle at 15% 20%, rgba(0,255,240,0.18), transparent 45%), radial-gradient(circle at 80% 0%, rgba(0,255,195,0.25), transparent 35%), linear-gradient(135deg, #01060f 0%, #041727 45%, #051c2e 100%)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "0.65" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "pulse-soft": "pulse-soft 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

