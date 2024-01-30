const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const mode = process.argv.includes('--mode=production') ?
  'production' :
  'development';
const libraryName = process.env.npm_package_name;

module.exports = {
  mode: mode,
  entry: {
    dist: './scripts/app.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: `${libraryName}.js`,
    clean: true
  },
  target: ['browserslist'],
  plugins: [
    new MiniCssExtractPlugin({
      filename: `${libraryName}.css`
    })
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        include: path.resolve(__dirname, 'scripts'),
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.(s[ac]ss|css)$/,
        include: path.resolve(__dirname, 'scripts'),
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: ''
            }
          },
          { loader: 'css-loader' },
          { loader: 'sass-loader' }
        ]
      },
      {
        test: /\.(png|woff|woff2|eot|ttf|svg|gif)$/,
        include: [
          path.resolve(__dirname, 'scripts'),
          path.resolve(__dirname, 'assets')
        ],
        type: 'asset/resource'
      }
    ]
  },
  stats: {
    colors: true
  },
  ...(mode !== 'production' && { devtool: 'eval-cheap-module-source-map' })
};
