import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'main.js',
        format: 'cjs', // Use CommonJS for Electron main process
      },
    },
  },
  resolve: {
    // Some libs that can run in both Web and Node.js environments export
    // Node.js code by default, which breaks in Vite. This tells Vite to
    // prefer the browser version of these libs.
    browserField: false,
    mainFields: ['module', 'jsnext:main', 'jsnext'],
  },
});
