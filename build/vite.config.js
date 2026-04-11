import { defineConfig } from 'vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(import.meta.dirname, '..');
const bannerText = readFileSync(resolve(root, 'build/banner.txt'), 'utf-8');

export default defineConfig({
  root,
  build: {
    outDir: 'dist',
    lib: {
      entry: resolve(root, 'src/index.js'),
      formats: ['iife'],
      name: 'QQMailDownloader',
      fileName: () => 'qqmail-downloader.user.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        extend: true,
        banner: bannerText,
      },
    },
    minify: false,
    target: 'es2020',
    emptyOutDir: true,
  },
  plugins: [
    cssInjectedByJsPlugin(),
  ],
});
