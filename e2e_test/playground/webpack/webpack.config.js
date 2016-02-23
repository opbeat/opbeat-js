module.exports = {
  entry: './app.js',
  output: {
    path: __dirname,
    filename: 'dist/bundle.js'
  },
  resolve: {
    alias: {
      'angular-opbeat': '../../../dist/angular-opbeat.js'
    }
  },
  devtool: 'source-map'
}
