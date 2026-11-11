import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// host: true = เปิดให้เครื่องอื่นในวงแลนเข้าได้
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
})
