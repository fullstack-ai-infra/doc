import path from 'path'
import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['vitestSetup.ts'],
    exclude: [...configDefaults.exclude, 'packages/cli/**'],
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: 'auth', replacement: path.resolve(__dirname, './src/auth') },
    ],
  },
})
