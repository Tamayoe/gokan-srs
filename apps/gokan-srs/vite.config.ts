import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import checker from 'vite-plugin-checker';

const isCI = process.env.NODE_ENV === 'production';

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        !isCI && checker({
            typescript: {
                buildMode: true,
                tsconfigPath: "./tsconfig.app.json",
            },
        }),
    ].filter(Boolean),
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
    test: {
        // The gokan-dataset submodule has its own test suite and CI - vitest's
        // default include glob would otherwise pick up dataset/scripts/*.test.ts too.
        exclude: [...configDefaults.exclude, 'dataset/**'],
    },
})