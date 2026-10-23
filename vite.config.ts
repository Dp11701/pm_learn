import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const congWeb = Number(process.env.CONG_WEB ?? 5320)
const congApi = Number(process.env.CONG_API ?? 5321)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: congWeb,
    strictPort: true,
    proxy: { '/api': `http://127.0.0.1:${congApi}` },
    // Không cho trang khác đọc file qua dev server; dữ liệu học và bài học chỉ đi qua API.
    cors: false,
    fs: {
      deny: [
        '.env',
        '.env.*',
        '*.{crt,pem}',
        '**/.git/**',
        '**/data/**',
        '**/noi-dung/**',
        '**/.mau/**',
        '**/*.db',
        '**/*.db-*',
      ],
    },
  },
  preview: { host: '127.0.0.1', port: congWeb, strictPort: true },
})
