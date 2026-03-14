import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'theme-bg-primary': 'rgb(var(--theme-bg-primary) / <alpha-value>)',
        'theme-bg-secondary': 'rgb(var(--theme-bg-secondary) / <alpha-value>)',
        'theme-text-primary': 'rgb(var(--theme-text-primary) / <alpha-value>)',
        'theme-text-secondary': 'rgb(var(--theme-text-secondary) / <alpha-value>)',
        'theme-text-accent': 'rgb(var(--theme-text-accent) / <alpha-value>)',
        'theme-border-primary': 'rgb(var(--theme-border-primary) / <alpha-value>)',
        'theme-border-secondary': 'rgb(var(--theme-border-secondary) / <alpha-value>)',
        'theme-button-bg': 'rgb(var(--theme-button-bg) / <alpha-value>)',
        'theme-button-hover-bg': 'rgb(var(--theme-button-hover-bg) / <alpha-value>)',
        'theme-button-text': 'rgb(var(--theme-button-text) / <alpha-value>)',
      },
      // Potentially other extensions like fontSize, spacing if needed for theme
    },
  },
  plugins: [],
};
export default config;
