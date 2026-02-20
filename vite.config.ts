import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import checker from 'vite-plugin-checker';
import { cpSync, existsSync, mkdirSync } from 'node:fs';

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
        {
            name: 'copy-data-plugin',
            closeBundle() {
                console.log('Copying data/compiled to dist/data/compiled...');
                if (!existsSync('dist/data')) mkdirSync('dist/data', { recursive: true });
                cpSync('data/compiled', 'dist/data/compiled', { recursive: true });
                console.log('Data copied successfully.');
            }
        }
    ].filter(Boolean),
    server: {
        watch: {
            ignored: ['**/data/compiled', '**/data/compiled/**'],
        }
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false,
        minify: 'terser',
    },
})