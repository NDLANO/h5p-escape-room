import path from 'path';
import { fileURLToPath } from 'url';
import process from 'node:process';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mode = process.argv.includes('--mode=production') ?
  'production' :
  'development';
const libraryName = process.env.npm_package_name;

export default {
  mode: mode,
  entry: {
    dist: './entries/dist.js'
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
