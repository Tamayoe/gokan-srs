import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import checker from 'vite-plugin-checker';

const isCI = process.env.NODE_ENV === 'production';

export default defineConfig({
    resolve: {
        alias: {
            'react-native': 'react-native-web',
            'react': path.resolve(__dirname, '../../node_modules/react'),
            'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
            'react/jsx-runtime': path.resolve(__dirname, '../../node_modules/react/jsx-runtime'),
            'react/jsx-dev-runtime': path.resolve(__dirname, '../../node_modules/react/jsx-dev-runtime'),
        },
        dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
        include: ['react-native-web']
    },
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
})