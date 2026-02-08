/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    // Enable cssnano for production builds to optimize CSS
    ...(process.env.NODE_ENV === 'production' && {
      cssnano: {
        preset: [
          'default',
          {
            // Optimize CSS custom properties
            discardComments: {
              removeAll: true,
            },
            // Reduce calc() expressions
            calc: true,
            // Merge duplicate rules
            mergeLonghand: true,
            // Minify selectors
            minifySelectors: true,
            // Remove unused CSS
            discardUnused: true,
          },
        ],
      },
    }),
  },
}

export default config
