import eslintConfigNdlaH5P from 'eslint-config-ndla-h5p';
import pluginReact from 'eslint-plugin-react';

export default [
  eslintConfigNdlaH5P.configs['flat/recommended'],
  pluginReact.configs.flat.recommended,
  {
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
];
