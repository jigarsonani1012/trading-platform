const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const WebSocketStreamServer = require('./websocket/streamServer');
const stockController = require('./controllers/stockController');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const WS_PORT = process.env.WS_PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// REST Routes
app.get('/api/stock/:symbol', stockController.getStock);
app.get('/api/stock/:symbol/history', stockController.getHistoricalData);
app.get('/api/search', stockController.searchStocks);
app.post('/api/stocks', stockController.getMultipleStocks);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start HTTP server
app.listen(PORT, () => {
    console.log(`🚀 HTTP server running on http://localhost:${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/health`);
    console.log(`💰 Example: http://localhost:${PORT}/api/stock/TCS`);
});

// Start WebSocket server for real-time data
const wsServer = new WebSocketStreamServer(WS_PORT);
wsServer.start();