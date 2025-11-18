import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3001,
        host: '0.0.0.0',
        proxy: {
            '/api': {
                target: 'http://192.168.10.137:8084',
                changeOrigin: true,
            }
        }
    },
    define: {
        'process.env.REACT_APP_API_URL': JSON.stringify('http://192.168.10.137:8084/api'),
        'process.env.PUBLIC_URL': JSON.stringify('')
    }
})

