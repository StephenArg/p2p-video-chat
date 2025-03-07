import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // base: '/filesharing/', // important for build - remove for dev
  plugins: [react()],
})
