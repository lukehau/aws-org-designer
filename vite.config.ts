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
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'zustand'],
            xyflow: ['@xyflow/react', 'dagre'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-popover', '@radix-ui/react-select', '@radix-ui/react-tooltip', 'sonner', 'lucide-react'],
            editor: ['codemirror', '@codemirror/lang-json', '@codemirror/lint', '@codemirror/state'],
            utils: ['lodash', 'clsx', 'tailwind-merge', 'class-variance-authority'],
          },
        },
      },
    },
  }
})
