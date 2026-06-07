const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all packages in the monorepo
config.watchFolders = [monorepoRoot];

// Resolve packages from both the app's and monorepo's node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Map workspace packages directly to their source directories.
// Metro's package exports support requires exact file paths (no extension resolution),
// but our packages use the "./*": "./src/*" wildcard pattern — so we bypass exports
// entirely and point Metro at the source roots, letting it resolve extensions normally.
config.resolver.unstable_enablePackageExports = false;
config.resolver.extraNodeModules = {
  '@gokan-srs/app': path.resolve(monorepoRoot, 'packages/app/src'),
  '@gokan-srs/core': path.resolve(monorepoRoot, 'packages/core/src'),
  '@gokan-srs/ui': path.resolve(monorepoRoot, 'packages/ui/src'),
};

// expo-file-system v55 moved the legacy API (readAsStringAsync, EncodingType, etc.)
// to a package exports subpath "./legacy" which Metro can't resolve when
// unstable_enablePackageExports is false. Map it directly to the source file.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'expo-file-system/legacy') {
    return {
      filePath: path.resolve(monorepoRoot, 'node_modules/expo-file-system/src/legacy/index.ts'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
