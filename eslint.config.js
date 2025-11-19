import eslintConfigNdlaH5P from 'eslint-config-ndla-h5p';
import pluginReact from 'eslint-plugin-react';
import pluginJsdoc from 'eslint-plugin-jsdoc';

export default [
  eslintConfigNdlaH5P.configs['flat/recommended'],
  pluginReact.configs.flat.recommended,
  pluginJsdoc.configs['flat/recommended'],
  {
    rules: {
      'jsdoc/valid-types': 0,
    },
    settings: {
      react: {
        version: 'detect',
      },
      jsdoc: {
        preferredTypes: {
          Function: 'function',
        },
      },
    },
  },
];
