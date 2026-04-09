const PROD_ORIGIN = 'https://trading-platform-62oa.onrender.com';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');
const toWebSocketOrigin = (value: string) => trimTrailingSlash(value).replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');

const getBrowserOrigin = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    return window.location.origin;
};

export const getApiBaseUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL?.trim();
    if (envUrl) {
        return trimTrailingSlash(envUrl);
    }

    const browserOrigin = getBrowserOrigin();
    if (browserOrigin && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        return 'http://localhost:5000/api';
    }

    return `${PROD_ORIGIN}/api`;
};

export const getWebSocketUrl = () => {
    const envUrl = import.meta.env.VITE_WS_URL?.trim();
    if (envUrl) {
        return trimTrailingSlash(envUrl);
    }

    const apiUrl = import.meta.env.VITE_API_URL?.trim();
    if (apiUrl) {
        return `${toWebSocketOrigin(apiUrl).replace(/\/api$/i, '')}/ws`;
    }

    if (typeof window === 'undefined') {
        return 'ws://localhost:5000/ws';
    }

    if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        return 'ws://localhost:5000/ws';
    }

    return `${toWebSocketOrigin(PROD_ORIGIN)}/ws`;
};
