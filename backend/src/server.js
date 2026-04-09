const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const WebSocketStreamServer = require('./websocket/streamServer');
const stockController = require('./controllers/stockController');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/stock/:symbol', stockController.getStock);
app.get('/api/stock/:symbol/history', stockController.getHistoricalData);
app.get('/api/search', stockController.searchStocks);
app.post('/api/stocks', stockController.getMultipleStocks);

app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`HTTP server running on http://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health`);
    console.log(`Example: http://localhost:${PORT}/api/stock/TCS`);
    console.log(`WebSocket: ws://localhost:${PORT}/ws`);
});

const wsServer = new WebSocketStreamServer(server, '/ws');
wsServer.start();
