import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import checker from 'vite-plugin-checker';
import fs from 'fs';

const isCI = process.env.NODE_ENV === 'production';

export default defineConfig({
    plugins: [
        {
            // Resolve all @gokan-srs/* workspace package imports to their TypeScript source.
            // Using resolveId (not resolve.alias regex) so that path.resolve works correctly
            // on Windows (no backslash/forward-slash mixing issues), and it applies to
            // both Rollup and Vite's esbuild dep-scanner.
            name: 'workspace-resolver',
            enforce: 'pre' as const,
            resolveId(id: string) {
                if (id === '@gokan-srs/core') return path.resolve(__dirname, '../../packages/core/src/index.ts');
                if (id === '@gokan-srs/app')  return path.resolve(__dirname, '../../packages/app/src/index.ts');
                if (id === '@gokan-srs/ui')   return path.resolve(__dirname, '../../packages/ui/src/index.ts');
                if (id.startsWith('@gokan-srs/core/')) return path.resolve(__dirname, `../../packages/core/src/${id.slice('@gokan-srs/core/'.length)}`);
                if (id.startsWith('@gokan-srs/app/'))  return path.resolve(__dirname, `../../packages/app/src/${id.slice('@gokan-srs/app/'.length)}`);
                if (id.startsWith('@gokan-srs/ui/'))   return path.resolve(__dirname, `../../packages/ui/src/${id.slice('@gokan-srs/ui/'.length)}`);
            }
        },
        {
            // Redirect react-native imports to react-native-web for web builds.
            name: 'react-native-web-fixes',
            enforce: 'pre' as const,
            resolveId(this: any, source: string) {
                if (source.includes('codegenNativeComponent')) {
                    return path.resolve(__dirname, 'src/utils/codegenNativeComponent.ts');
                }
                if (source.startsWith('react-native/')) {
                    return this.resolve(source.replace('react-native/', 'react-native-web/'), '', { skipSelf: true });
                }
                if (source === 'react-native') {
                    return this.resolve('react-native-web', '', { skipSelf: true });
                }
            }
        },
        react(),
        tailwindcss(),
        !isCI && checker({
            typescript: {
                buildMode: true,
                tsconfigPath: './tsconfig.app.json',
            },
        }),
    ].filter(Boolean),
    resolve: {},
    optimizeDeps: {
        // Pre-bundle RN-web packages so esbuild processes them into a single chunk.
        include: ['react-native-web', '@expo/vector-icons', 'react-native-svg'],
        // Exclude workspace packages — their TypeScript source may contain cross-package
        // sub-path imports (@gokan-srs/core/commons/theme) that esbuild can't resolve.
        // With exclude, esbuild treats them as external; the workspace-resolver plugin
        // (running in Vite's rollup layer) handles them correctly at serve time.
        exclude: ['@gokan-srs/core', '@gokan-srs/ui', '@gokan-srs/app'],
        esbuildOptions: {
            // On Windows with Bun, node_modules symlinks/junctions for react, react-dom,
            // and react-native resolve to directory paths that esbuild can't open as files.
            // Marking them external prevents esbuild from bundling them during optimizeDeps;
            // Vite's module server handles them correctly at serve time.
            external: [
                'react',
                'react-dom',
                'react/jsx-runtime',
                'react/jsx-dev-runtime',
                'react-dom/client',
                'react-native',
            ],
            plugins: [
                {
                    name: 'esbuild-react-native-fixes',
                    setup(build) {
                        build.onResolve({ filter: /codegenNativeComponent/ }, () => {
                            return { path: path.resolve(__dirname, 'src/utils/codegenNativeComponent.ts') };
                        });
                        build.onLoad({ filter: /\.js$/ }, (args) => {
                            const normalizedPath = args.path.replace(/\\/g, '/');
                            if (normalizedPath.includes('@expo/vector-icons') || normalizedPath.includes('react-native-vector-icons')) {
                                return {
                                    loader: 'jsx',
                                    contents: fs.readFileSync(args.path, 'utf8'),
                                };
                            }
                        });
                    }
                }
            ]
        }
    },
    server: {
        watch: {
            ignored: ['**/public/data/compiled', '**/public/data/compiled/**'],
        }
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false,
        minify: 'terser',
    },
});