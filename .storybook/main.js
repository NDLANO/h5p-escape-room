const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const useLessLoader = require('storybook-less-loader');
module.exports = {
  stories: ['../scripts/**/*.stories.mdx', '../scripts/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-links', '@storybook/addon-essentials'],
  webpackFinal: async (config) => {
    addScssSupport(config);
    useLessLoader(config);
    return config;
  },
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  docs: {
    autodocs: true,
  },
};
function addScssSupport(config) {
  config.plugins.push(new MiniCssExtractPlugin());
  config.module.rules.push({
    test: /\.module.scss$/,
    use: [
      MiniCssExtractPlugin.loader,
      {
        loader: 'css-loader',
        options: {
          modules: true,
        },
      },
      'sass-loader',
    ],
  });
  config.module.rules.push({
    test: /\.scss$/,
    use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
    exclude: /\.module\.scss$/,
  });
}
