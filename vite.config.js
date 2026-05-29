import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    const apiBaseUrl = env.VITE_API_BASE_URL
        || (mode === 'staging' ? '/api' : 'http://89.109.8.59:8085/api')

    return {
        plugins: [react()],
        server: {
            port: 3002,
            host: '0.0.0.0',
            proxy: {
                '/api': {
                    target: env.VITE_DEV_API_PROXY || 'http://89.109.8.59:8085',
                    changeOrigin: true,
                }
            }
        },
        define: {
            'process.env.REACT_APP_API_URL': JSON.stringify(apiBaseUrl),
            'process.env.PUBLIC_URL': JSON.stringify('')
        }
    }
})

