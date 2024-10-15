import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import { defineConfig, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
import copy from 'rollup-plugin-copy';

export default defineConfig({
  server: {
    proxy: {
      // Needed to defeat CORS
      '/api': {
        target: 'http://localhost:9000', // Docker lambda server
        changeOrigin: true, // needed for virtual hosted sites
        rewrite: (path) => path.replace(/^\/api/, '/2015-03-31/functions/function/invocations'),
      },
    },
  },
  plugins: [
    {
      name: 'treat-js-files-as-jsx',
      async transform(code, id) {
        if (!id.match(/src\/.*\.js$/)) return null

        // Use the exposed transform from vite, instead of directly
        // transforming with esbuild
        return transformWithEsbuild(code, id, {
          loader: 'jsx',
          jsx: 'automatic',
        })
      },
    },
    react(),
    copy({
      targets: [{ src: 'node_modules/**/*.wasm', dest: 'node_modules/.vite/dist' }],
      copySync: true,
      hook: 'buildStart',
    }),
    {
      name: 'wasm-content-type-plugin',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url.endsWith('.wasm') && req.url.includes('.vite/deps')) {
            res.setHeader('Content-Type', 'application/wasm');
            const newPath = req.url.replace('deps', 'dist');
            const targetPath = join(__dirname, newPath);
            const wasmContent = readFileSync(targetPath);
            return res.end(wasmContent);
          }
          next();
        });
      },
    },
  ],

  optimizeDeps: {
    force: true,
    esbuildOptions: {
      target: 'esnext', // Ensures modern JavaScript is used for dependency optimization
      loader: {
        '.js': 'jsx',
      },
    },
  },

  build: {
    target: 'esnext', // Updated browser targets
    // Explicitly pass esbuild target to prevent transpiling top-level await
    esbuild: {
      target: 'esnext', // Ensures esbuild is using the latest JavaScript features
    },
  },
  assetsInclude: ['**/*.wasm'],
})

