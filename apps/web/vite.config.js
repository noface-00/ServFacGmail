import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.js'],
    css: false,
    // Las pruebas apuntan a una URL ficticia que intercepta MSW (src/tests/msw/).
    env: { VITE_API_URL: 'http://api.test' },
  },
})
