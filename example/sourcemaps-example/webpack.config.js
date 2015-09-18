var path = require('path')
var webpack = require('webpack')

var BUILD_DIR = path.join(__dirname, 'build')

var config = {
  context: path.join(__dirname, 'src'),
  devServer: {
  	contentBase: BUILD_DIR
  },
	devtool: '#source-map',
	entry: './scripts/index.js',
	module: {
		loaders: [{
			test: /index\.html$/,
			loader: 'file-loader?name=[path][name].[ext]&context=./src'
		}]
  },
  plugins: [
      new webpack.optimize.UglifyJsPlugin()
  ],
  output: {
  	path: BUILD_DIR,
  	filename: 'bundle.js'
  }
}

module.exports = config
