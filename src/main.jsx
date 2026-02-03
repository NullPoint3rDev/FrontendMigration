import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/main_page.css';
import './index.css';
import wtLogoUrl from './images/WTLogo.png';

// Favicon из WTLogo — через импорт, чтобы Vite отдавал файл по корректному URL
(function setFavicon() {
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/png';
        document.head.appendChild(link);
    }
    link.href = wtLogoUrl;
})();

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

