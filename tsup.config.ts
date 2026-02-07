import { defineConfig } from 'tsup';
import { readFileSync, cpSync, mkdirSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  define: {
    PACKAGE_VERSION: JSON.stringify(pkg.version),
  },
  onSuccess: async () => {
    mkdirSync('dist/data', { recursive: true });
    cpSync('data/nf-glyphs.json', 'dist/data/nf-glyphs.json');
  },
});
