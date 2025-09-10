const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // Enable CSS support
  isCSSEnabled: true,
});

// Add the additional resolver
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'css'];

module.exports = config;