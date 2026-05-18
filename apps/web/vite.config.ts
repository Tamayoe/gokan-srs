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
                // ── Web-specific platform overrides ────────────────────────────────────
                // Must come BEFORE the general @gokan-srs/app/* rule so that this file
                if (id === 'react-native-svg') {
                    return path.resolve(__dirname, 'src/utils/react-native-svg.tsx');
                }


                if (id === '@gokan-srs/app/components/Icon') {
                    return path.resolve(__dirname, 'src/components/Icon.tsx');
                }

                // ── General workspace resolution ────────────────────────────────────────
                let resolved: string | null = null;

                if (id === '@gokan-srs/core') resolved = path.resolve(__dirname, '../../packages/core/src/index.ts');
                else if (id === '@gokan-srs/app') resolved = path.resolve(__dirname, '../../packages/app/src/index.ts');
                else if (id === '@gokan-srs/ui') resolved = path.resolve(__dirname, '../../packages/ui/src/index.ts');
                else if (id.startsWith('@gokan-srs/core/')) resolved = path.resolve(__dirname, `../../packages/core/src/${id.slice('@gokan-srs/core/'.length)}`);
                else if (id.startsWith('@gokan-srs/app/')) resolved = path.resolve(__dirname, `../../packages/app/src/${id.slice('@gokan-srs/app/'.length)}`);
                else if (id.startsWith('@gokan-srs/ui/')) resolved = path.resolve(__dirname, `../../packages/ui/src/${id.slice('@gokan-srs/ui/'.length)}`);

                if (!resolved) return;

                // If the path already has an extension and exists, return as-is.
                if (path.extname(resolved) && fs.existsSync(resolved)) return resolved;

                // Try extensions in priority order.
                for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
                    const candidate = resolved + ext;
                    if (fs.existsSync(candidate)) return candidate;
                }

                // Try as directory index.
                for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
                    const candidate = path.join(resolved, `index${ext}`);
                    if (fs.existsSync(candidate)) return candidate;
                }

                return resolved; // Let Vite handle the error if nothing matched.
            }
        },
        {
            // Redirect react-native imports to react-native-web for web builds.
            // codegenNativeComponent stub is still needed for any RN lib that imports
            // it (e.g. old react-native-svg versions) but @expo/vector-icons is now
            // never imported by the web build, so its shims are removed.
            name: 'react-native-web-fixes',
            enforce: 'pre' as const,
            resolveId(this: any, source: string) {
                if (source.includes('codegenNativeComponent')) {
                    return path.resolve(__dirname, 'src/utils/codegenNativeComponent.ts');
                }
                if (source === 'react-native') {
                    return this.resolve('react-native-web', '', { skipSelf: true });
                }
                if (source.startsWith('react-native/')) {
                    return this.resolve(
                        source.replace('react-native/', 'react-native-web/'),
                        '',
                        { skipSelf: true }
                    );
                }
            },
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
    optimizeDeps: {
        // Exclude workspace packages — their TypeScript source may contain cross-package
        // sub-path imports (@gokan-srs/core/commons/theme) that esbuild can't resolve.
        // With exclude, esbuild treats them as external; the workspace-resolver plugin
        // (running in Vite's rollup layer) handles them correctly at serve time.
        //
        // Also exclude react-native-svg: even the compiled web output requires
        // 'react-native', which esbuild would try to resolve through Bun's cache
        // and hit Flow-typed files. Excluding it means Vite handles it at request
        // time via the react-native-web-fixes resolveId plugin instead.
        exclude: [
            '@gokan-srs/core',
            '@gokan-srs/ui',
            '@gokan-srs/app',
            'react-native-svg',
            'react-native',
            'expo-modules-core',
        ],
        include: [
            // react-native-web is CJS — it must be pre-bundled to CJS→ESM.
            // It doesn't import react-native directly (it IS the react-native polyfill).
            'react-native-web',
        ],
        esbuildOptions: {
            jsx: 'automatic',
            loader: { '.js': 'jsx' },
        },
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
    define: {
        global: 'window',
    },
});