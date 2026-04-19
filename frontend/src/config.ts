const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');
const ensureApiPath = (value: string) => {
    const normalized = trimTrailingSlash(value);
    return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
};

const getBrowserOrigin = () => (typeof window === 'undefined' ? '' : window.location.origin);

export const getApiBaseUrl = () => {
    const configured = import.meta.env.VITE_API_URL?.trim();

    if (configured) {
        return ensureApiPath(configured);
    }

    return '/api';
};

export const getWebSocketUrl = () => {
    const configured = import.meta.env.VITE_WS_URL?.trim();

    if (configured) {
        return trimTrailingSlash(configured);
    }

    const origin = getBrowserOrigin();
    if (!origin) {
        return '/ws';
    }

    const wsOrigin = origin.startsWith('https://')
        ? origin.replace(/^https:\/\//, 'wss://')
        : origin.replace(/^http:\/\//, 'ws://');

    return `${trimTrailingSlash(wsOrigin)}/ws`;
};
