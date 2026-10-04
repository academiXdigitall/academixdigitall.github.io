import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        about: resolve(__dirname, 'about.html'),
        ventures: resolve(__dirname, 'ventures.html'),
        openSource: resolve(__dirname, 'open-source.html'),
        contact: resolve(__dirname, 'contact.html'),
      },
    },
  },
})