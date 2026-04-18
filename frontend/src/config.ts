const trimTrailingSlash = (value: string) =>
    value.replace(/\/+$/, '');

export const getApiBaseUrl = () => {
    console.log(import.meta.env.VITE_API_URL);
    
    return trimTrailingSlash(import.meta.env.VITE_API_URL);

};

export const getWebSocketUrl = () => {
    return trimTrailingSlash(import.meta.env.VITE_WS_URL);
};