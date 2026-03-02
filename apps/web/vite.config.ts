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
            name: 'react-native-web-fixes',
            enforce: 'pre' as const,
            resolveId(this: any, source: string) {
                if (source.includes('codegenNativeComponent')) {
                    // Resolve strictly to our mock file
                    return path.resolve(__dirname, 'src/utils/codegenNativeComponent.ts');
                }
                if (source.startsWith('react-native/')) {
                    // Remap sub-paths
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
                tsconfigPath: "./tsconfig.app.json",
            },
        }),
    ].filter(Boolean),
    resolve: {
        alias: [
            { find: 'react', replacement: path.resolve(__dirname, '../../node_modules/react') },
            { find: 'react-dom', replacement: path.resolve(__dirname, '../../node_modules/react-dom') },
            { find: 'react/jsx-runtime', replacement: path.resolve(__dirname, '../../node_modules/react/jsx-runtime') },
            { find: 'react/jsx-dev-runtime', replacement: path.resolve(__dirname, '../../node_modules/react/jsx-dev-runtime') },
        ],
        dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
        include: ['react-native-web', '@expo/vector-icons', 'react-native-svg'],
        esbuildOptions: {
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