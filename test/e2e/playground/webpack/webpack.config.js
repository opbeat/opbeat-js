module.exports = {
  entry: './app.js',
  output: {
    path: __dirname,
    filename: 'dist/bundle.js'
  },
  resolve: {
    alias: {
      'opbeat-angular': '../../../dist/opbeat-angular.js'
    }
  },
  devtool: 'source-map'
}
