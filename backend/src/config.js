const parseOrigins = (value = '') =>
    value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

const config = {
    get port() {
        return Number(process.env.PORT) || 5000;
    },
    get mongodbUri() {
        return process.env.MONGODB_URI || '';
    },
    get frontendUrl() {
        return process.env.FRONTEND_URL?.trim() || 'http://localhost:5173';
    },
    get allowedOrigins() {
        return parseOrigins(process.env.ALLOWED_ORIGINS);
    },
    get isProduction() {
        return process.env.NODE_ENV === 'production';
    },
};

module.exports = { config };
