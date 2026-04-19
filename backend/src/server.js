const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
const WebSocketStreamServer = require('./websocket/streamServer');
const stockController = require('./controllers/stockController');
const sharedRoutes = require('./Routes/sharedRoutes');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { config } = require('./config');

const app = express();
const PORT = config.port;
const allowedOrigins = config.allowedOrigins;

const corsOptions = {
    origin(origin, callback) {
        if (!origin) {
            callback(null, true);
            return;
        }

        if (allowedOrigins.length === 0) {
            const isLocalOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
            callback(isLocalOrigin ? null : new Error('Origin not allowed by CORS'), isLocalOrigin);
            return;
        }

        const isAllowed = allowedOrigins.includes(origin);
        callback(isAllowed ? null : new Error('Origin not allowed by CORS'), isAllowed);
    },
};

const connectToMongo = async () => {
    if (!config.mongodbUri) {
        console.warn('MongoDB URI not configured. Share features will be unavailable.');
        return;
    }

    try {
        await mongoose.connect(config.mongodbUri);
        console.log('MongoDB connected');
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
    }
};

app.disable('x-powered-by');
app.use(cors(corsOptions));
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});
app.use(express.json());
app.use('/api', sharedRoutes);

app.get('/api/stock/:symbol', stockController.getStock);
app.get('/api/stock/:symbol/history', stockController.getHistoricalData);
app.get('/api/stock/:symbol/chart', stockController.getChartData);
app.get('/api/search', stockController.searchStocks);
app.post('/api/stocks', stockController.getMultipleStocks);

app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const server = http.createServer(app);
const wsServer = new WebSocketStreamServer(server, '/ws');

const startServer = async () => {
    await connectToMongo();
    wsServer.start();

    server.listen(PORT, () => {
        console.log(`HTTP server listening on port ${PORT}`);
        console.log(`Frontend URL: ${config.frontendUrl}`);
        console.log(`Health endpoint: /health`);
        console.log(
            allowedOrigins.length > 0
                ? `CORS origins: ${allowedOrigins.join(', ')}`
                : 'CORS origins: localhost/127.0.0.1 only (set ALLOWED_ORIGINS before production)'
        );
    });
};

if (require.main === module) {
    startServer();
}

module.exports = { app, server, startServer };
