import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3002,
        host: '0.0.0.0',
        proxy: {
            '/api': {
                target: 'http://89.109.8.59:8085',
                changeOrigin: true,
            }
        }
    },
    define: {
        'process.env.REACT_APP_API_URL': JSON.stringify('http://89.109.8.59:8085/api'),
        'process.env.PUBLIC_URL': JSON.stringify('')
    }
})

