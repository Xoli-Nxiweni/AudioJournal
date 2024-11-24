module.exports = {
    presets: ['module:metro-react-native-babel-preset'],
    plugins: [
      [
        'module:react-native-dotenv', // Environment variable plugin
        {
          moduleName: '@env',
          path: '.env',
        },
      ],
      [
        '@babel/plugin-transform-class-properties',
        {
          loose: true, // Set loose mode
        },
      ],
      [
        '@babel/plugin-transform-private-methods',
        {
          loose: true, // Set loose mode for private methods
        },
      ],
      [
        '@babel/plugin-transform-private-property-in-object',
        {
          loose: true, // Set loose mode for private properties in objects
        },
      ],
    ],
  };
  