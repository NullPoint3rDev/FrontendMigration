export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://95.172.58.219:8084/api';

// Пробуем разные варианты WebSocket URL
const getWebSocketUrl = () => {
    if (process.env.REACT_APP_WEBSOCKET_URL) {
        return process.env.REACT_APP_WEBSOCKET_URL;
    }
    
    // Пробуем разные варианты в зависимости от окружения
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:8084/api/ws';
    } else if (hostname.includes('192.168')) {
        return 'http://192.168.10.137:8084/api/ws';
    } else {
        return 'http://95.172.58.219:8084/api/ws';
    }
};

export const WEBSOCKET_URL = getWebSocketUrl();