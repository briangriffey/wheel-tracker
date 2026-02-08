import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary green palette (50-900 scale)
        // Base color: #43D984
        primary: {
          50: '#E8FBF0',
          100: '#C7F5DC',
          200: '#9FEDC1',
          300: '#76E5A6',
          400: '#5ADE91',
          500: '#43D984',
          600: '#31C572',
          700: '#28A65F',
          800: '#1F8249',
          900: '#176638',
        },
        // Accent brown palette
        // Base color: #59332A
        accent: {
          50: '#F9F3F2',
          100: '#EDD9D5',
          200: '#D9ADA3',
          300: '#C58171',
          400: '#8F5A4E',
          500: '#59332A',
          600: '#4A2A23',
          700: '#3B221C',
          800: '#2C1915',
          900: '#1D110E',
        },
        // Neutral gray scale
        neutral: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
        // Semantic colors
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
      },
    },
  },
  plugins: [],
}
export default config
