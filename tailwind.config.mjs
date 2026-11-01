// Mirrors Medtransport/tailwind.config.mjs (web dashboard design system).
// Landing-page background images and the custom typography preset are omitted;
// everything the dashboard uses is kept verbatim so class names match 1:1.
import animate from 'tailwindcss-animate';
import typography from '@tailwindcss/typography';
import scrollbar from 'tailwind-scrollbar';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    fontSize: {
      xs: ['12px', '20px'],
      sm: ['14px', '20px'],
      base: ['16px', '24px'],
      lg: ['18px', '24px'],
      xl: ['20px', '24px'],
      '2xl': ['24px', '32px'],
      '3xl': ['32px', '40px'],
      '4xl': ['40px', '48px'],
      '6xl': ['48px', '56px'],
    },
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      screens: { mlg: '992px' },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      maxWidth: { content: 'max-content' },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        'primary-muted': {
          DEFAULT: 'hsl(var(--primary-muted))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          light: 'hsl(var(--success))',
          'dark-light': 'hsl(var(--success))',
        },
        danger: {
          DEFAULT: 'hsl(var(--destructive))',
          light: 'hsl(var(--destructive))',
          'dark-light': 'hsl(var(--destructive))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          light: 'hsl(var(--warning))',
          'dark-light': 'hsl(var(--warning))',
        },
        info: {
          DEFAULT: '#2196f3',
          light: '#e7f7ff',
          'dark-light': 'rgba(33,150,243,.15)',
        },
        dark: {
          DEFAULT: '#3b3f5c',
          light: '#eaeaec',
          'dark-light': 'rgba(59,63,92,.15)',
        },
        black: {
          DEFAULT: '#0e1726',
          light: '#e3e4eb',
          'dark-light': 'rgba(14,23,38,.15)',
        },
        white: {
          DEFAULT: '#ffffff',
          light: '#e0e6ed',
          dark: '#888ea8',
        },
        darkTextGray: { DEFAULT: 'hsl(var(--sidebarGray))' },
        sidebarGray: { DEFAULT: 'hsl(var(--sidebarGray))' },
        tableHeader: { DEFAULT: 'hsl(var(--tableHeader))' },
        lightTextGray: { DEFAULT: 'hsl(var(--bodyGray))' },
        bodyGray: { DEFAULT: 'hsl(var(--bodyGray))' },
        primaryBlack: { DEFAULT: 'hsl(var(--primary-black))' },
        primaryGray: { DEFAULT: 'hsl(var(--primary-gray))' },
        primaryYellow: { DEFAULT: 'hsl(var(--primary-yellow))' },
        primaryBlue: { DEFAULT: 'hsl(var(--primary-blue))' },
        neutralGray: { DEFAULT: 'hsl(var(--neutral-gray))' },
        primaryWhite: { DEFAULT: 'hsl(var(--primary-white))' },
        primaryRed: { DEFAULT: 'hsl(var(--primary-red))' },
        primaryGreen: { DEFAULT: 'hsl(var(--primary-green))' },
        headingBlack: { DEFAULT: 'hsl(var(--heading-black))' },
        stroke: { DEFAULT: 'hsl(var(--stroke))' },
        primaryHoverMenu: { DEFAULT: 'hsl(var(--primary-hover-menu))' },
        'brand-deep-blue': '#0062FF',
        'brand-blue': '#4285F4',
        'brand-green': '#34A853',
        'brand-red': '#E84536',
        'brand-yellow': '#FACA3E',
        'brand-black': '#1A1A1A',
        'brand-gray': '#6B6B6B',
        'brand-light-gray': '#C1C1C1',
        'brand-white': '#FFFFFF',
        'brand-soft-teal': '#07A28729',
        'brand-teal': '#07A287',
        lightBlue: '#C5DBFF',
        lightRed: '#FFDADA',
        offWhite: '#FCFCFC',
        lightGreen: '#DEFFCF',
      },
      backgroundImage: {
        'white-to-blue': 'linear-gradient(90deg, #F1F6FF 0%, #A0E6FF 100%)',
      },
      boxShadow: {
        brand: '0px 2px 24px 0px rgba(0, 0, 0, 0.10)',
        top: '0px 4px 24px 0px rgba(0, 0, 0, 0.25)',
        card: '0px 0px 10px 0px rgba(33, 40, 50, 0.15)',
      },
      dropShadow: { card: '0px 1px 8px 0px #0000000D' },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
        'caret-blink': {
          '0%,70%,100%': { opacity: '1' },
          '20%,50%': { opacity: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'caret-blink': 'caret-blink 1.25s ease-out infinite',
      },
    },
  },
  plugins: [animate, typography, scrollbar],
};
