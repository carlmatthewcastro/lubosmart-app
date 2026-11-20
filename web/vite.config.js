import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        host: '127.0.0.1',
        watch: {
            // Flutter and Android SDK/build files are independent of the web app.
            ignored: ['**/.tools/**', '**/mobile/**'],
        },
    },
    resolve: {
        alias: {
            '@/pages': fileURLToPath(new URL('./resources/views/pages', import.meta.url)),
            '@/components': fileURLToPath(new URL('./resources/views/components', import.meta.url)),
            '@/layouts': fileURLToPath(new URL('./resources/views/layouts', import.meta.url)),
            '@': fileURLToPath(new URL('./resources/js', import.meta.url)),
        },
    },
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.jsx',
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    esbuild: {
        jsx: 'automatic',
    },
});
