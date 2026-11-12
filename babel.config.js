module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    '@babel/plugin-proposal-export-namespace-from',
    [
      'module-resolver',
      {
        root: ['.'],
        extensions: [
          '.ios.ts',
          '.ios.tsx',
          '.tsx',
          '.ts',
          '.ios.js',
          '.ios.jsx',
          '.jsx',
          '.js',
          '.json',
        ],
        alias: {
          '@': './src',
          // '@config': './src/config',
          // '@store': './src/store',
          // '@components': './src/components',
          // '@navigation': './src/navigation',
          // '@screens': './src/screens',
          // '@theme': './src/theme',
        },
      },
    ],
  ],
}
