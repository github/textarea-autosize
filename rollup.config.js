import babel from 'rollup-plugin-babel'

const pkg = require('./package.json')

export default {
  input: 'textarea-autosize.js',
  output: [
    {
      file: pkg['module'],
      format: 'es'
    },
    {
      file: pkg['main'],
      format: 'umd',
      name: 'textareaAutosize'
    }
  ],
  plugins: [
    babel({
      presets: ['es2015-rollup']
    })
  ]
}
