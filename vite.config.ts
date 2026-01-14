import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the
  // `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss(), svgr()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: env.VITE_PORT ? Number(env.VITE_PORT) : 3000,
      host: '0.0.0.0',
    },
    build: {
      // Raise limit to 600KB - the main chunk is ~572KB which is acceptable for this SPA.
      // The gzipped size (~158KB) is reasonable, and heavy components like the JSON editor
      // are already lazy loaded. The warning exists to catch accidental bloat.
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'zustand'],
            xyflow: ['@xyflow/react', 'dagre'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-popover', '@radix-ui/react-select', '@radix-ui/react-tooltip', '@radix-ui/react-alert-dialog', '@radix-ui/react-collapsible', '@radix-ui/react-label', '@radix-ui/react-progress', '@radix-ui/react-radio-group', '@radix-ui/react-separator', '@radix-ui/react-slot', '@radix-ui/react-switch', '@radix-ui/react-toast', 'sonner', 'cmdk'],
            icons: ['lucide-react'],
            // Note: CodeMirror (editor) is intentionally excluded from manualChunks
            // to allow lazy loading via React.lazy() in PolicyTab.tsx
            utils: ['lodash', 'clsx', 'tailwind-merge', 'class-variance-authority'],
            tour: ['driver.js', 'html-to-image'],
          },
        },
      },
    },
  }
})
