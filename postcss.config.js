import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default {
  plugins: [
    tailwindcss(),
    autoprefixer(),
    {
      postcssPlugin: 'postcss-swiftshare-cleanup',
      OnceExit(root) {
        root.walkDecls((decl) => {
          if ([
            '-webkit-text-size-adjust',
            '-moz-column-gap',
            '-moz-osx-font-smoothing',
            '-webkit-optimize-contrast',
          ].includes(decl.prop)) {
            decl.remove()
          }
        })
      },
    },
  ],
}
