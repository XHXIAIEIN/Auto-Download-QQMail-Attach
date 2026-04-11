import { defineConfig } from 'vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(import.meta.dirname, '..');
const bannerText = readFileSync(resolve(root, 'build/banner.txt'), 'utf-8').trim();
const outFile = resolve(root, 'dist/qqmail-downloader.user.js');

/** Post-build plugin: prepend UserScript banner to output */
function userscriptBanner() {
  return {
    name: 'userscript-banner',
    closeBundle() {
      const code = readFileSync(outFile, 'utf-8');
      writeFileSync(outFile, bannerText + '\n' + code);
    },
  };
}

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
        extend: true,
      },
    },
    minify: false,
    target: 'es2020',
    emptyOutDir: true,
  },
  plugins: [
    cssInjectedByJsPlugin(),
    userscriptBanner(),
  ],
});
