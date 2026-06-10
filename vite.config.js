import { defineConfig } from 'vite';
import apiPlugin from './server/vite-plugin-api.js';

export default defineConfig({
    plugins: [apiPlugin()],
    server: {
        port: 3000,
        open: true
    },
    build: {
        outDir: 'dist'
    }
});
