const WebSocket = require('ws');
const yfinanceService = require('../services/yfinanceService');

class WebSocketStreamServer {
    constructor(port) {
        this.port = port;
        this.wss = null;
        this.subscriptions = new Map();
        this.clientSubscriptions = new Map();
        this.pollInterval = null;
        this.heartbeatInterval = null;
    }

    start() {
        this.wss = new WebSocket.Server({ port: this.port });
        console.log(`WebSocket running on ws://localhost:${this.port}`);

        this.startPolling();

        this.wss.on('connection', (ws) => {
            console.log('Client connected');
            ws.isAlive = true;
            this.clientSubscriptions.set(ws, new Set());

            ws.on('pong', () => {
                ws.isAlive = true;
            });

            ws.on('message', async (message) => {
                await this.handleMessage(ws, message);
            });

            ws.on('close', () => this.cleanupClient(ws));
            ws.on('error', () => this.cleanupClient(ws));
        });

        this.heartbeatInterval = setInterval(() => {
            this.wss.clients.forEach((ws) => {
                if (!ws.isAlive) {
                    ws.terminate();
                    return;
                }

                ws.isAlive = false;
                ws.ping();
            });
        }, 30000);
    }

    async handleMessage(ws, message) {
        let data;

        try {
            data = JSON.parse(message);
        } catch {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
            return;
        }

        const { action, symbol } = data;

        if (action === 'subscribe') {
            await this.subscribe(ws, symbol);
            return;
        }

        if (action === 'unsubscribe') {
            this.unsubscribe(ws, symbol);
            return;
        }

        if (action === 'getQuote' && symbol) {
            try {
                const quote = await yfinanceService.getQuote(symbol);
                ws.send(JSON.stringify({ type: 'quote', symbol, data: quote }));
            } catch (error) {
                ws.send(JSON.stringify({ type: 'error', symbol, message: error.message }));
            }
        }
    }

    async subscribe(ws, symbol) {
        const normalized = symbol?.trim()?.toUpperCase();

        if (!normalized) {
            return;
        }

        if (!this.subscriptions.has(normalized)) {
            this.subscriptions.set(normalized, new Set());
        }

        this.subscriptions.get(normalized).add(ws);
        this.clientSubscriptions.get(ws)?.add(normalized);
        ws.send(JSON.stringify({ type: 'subscribed', symbol: normalized }));

        try {
            const quote = await yfinanceService.getQuote(normalized);

            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'price', symbol: normalized, data: quote }));
            }
        } catch (error) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'error', symbol: normalized, message: error.message }));
            }
        }
    }

    unsubscribe(ws, symbol) {
        const normalized = symbol?.trim()?.toUpperCase();

        if (!normalized) {
            return;
        }

        this.subscriptions.get(normalized)?.delete(ws);
        this.clientSubscriptions.get(ws)?.delete(normalized);

        if (this.subscriptions.get(normalized)?.size === 0) {
            this.subscriptions.delete(normalized);
        }

        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'unsubscribed', symbol: normalized }));
        }
    }

    cleanupClient(ws) {
        const symbols = this.clientSubscriptions.get(ws) || new Set();

        symbols.forEach((symbol) => {
            this.subscriptions.get(symbol)?.delete(ws);

            if (this.subscriptions.get(symbol)?.size === 0) {
                this.subscriptions.delete(symbol);
            }
        });

        this.clientSubscriptions.delete(ws);
    }

    startPolling() {
        this.pollInterval = setInterval(async () => {
            if (this.subscriptions.size === 0) {
                return;
            }

            const symbols = Array.from(this.subscriptions.keys());
            const results = await Promise.allSettled(symbols.map((symbol) => yfinanceService.getQuote(symbol)));

            results.forEach((result, index) => {
                if (result.status !== 'fulfilled') {
                    return;
                }

                const symbol = symbols[index];
                const clients = this.subscriptions.get(symbol);

                if (!clients?.size) {
                    return;
                }

                const payload = JSON.stringify({
                    type: 'price',
                    symbol,
                    data: result.value,
                });

                clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(payload);
                    }
                });
            });
        }, 2000);
    }
}

module.exports = WebSocketStreamServer;
