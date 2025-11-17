import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3001,
        host: '0.0.0.0',
        proxy: {
            '/api': {
                target: 'http://95.172.58.219:8084',
                changeOrigin: true,
            }
        }
    },
    define: {
        'process.env.REACT_APP_API_URL': JSON.stringify('http://95.172.58.219:8084/api'),
        'process.env.PUBLIC_URL': JSON.stringify('')
    }
})

