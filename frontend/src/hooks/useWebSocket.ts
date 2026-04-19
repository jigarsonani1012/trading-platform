import { useEffect, useMemo, useRef, useState } from 'react';
import { getWebSocketUrl } from '../config';
import type { StockQuote } from '../types/stock';

interface UseWebSocketOptions {
    onPriceUpdate?: (symbol: string, data: StockQuote) => void;
    onConnected?: () => void;
    onDisconnected?: () => void;
}

type PriceListener = (symbol: string, data: StockQuote) => void;
type ConnectionListener = (isConnected: boolean) => void;

class WebSocketManager {
    private ws: WebSocket | null = null;
    private subscriptionCounts = new Map<string, number>();
    private priceListeners = new Set<PriceListener>();
    private connectionListeners = new Set<ConnectionListener>();
    private isConnected = false;
    private shouldReconnect = true;

    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        this.shouldReconnect = true;
        this.ws = new WebSocket(getWebSocketUrl());

        this.ws.onopen = () => {
            this.isConnected = true;
            this.emitConnection();

            this.subscriptionCounts.forEach((_count, symbol) => {
                this.ws?.send(JSON.stringify({ action: 'subscribe', symbol }));
            });
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);

            if (message.type === 'price' && message.data) {
                this.priceListeners.forEach((listener) => {
                    listener(message.symbol, message.data);
                });
            }
        };

        this.ws.onclose = () => {
            this.isConnected = false;
            this.emitConnection();
            this.ws = null;

            if (this.shouldReconnect) {
                window.setTimeout(() => this.connect(), 3000);
            }
        };
    }

    subscribe(symbol: string) {
        const normalized = symbol.trim().toUpperCase();
        if (!normalized) {
            return;
        }

        const currentCount = this.subscriptionCounts.get(normalized) ?? 0;
        this.subscriptionCounts.set(normalized, currentCount + 1);
        this.connect();

        if (currentCount === 0 && this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ action: 'subscribe', symbol: normalized }));
        }
    }

    unsubscribe(symbol: string) {
        const normalized = symbol.trim().toUpperCase();
        if (!normalized) {
            return;
        }

        const currentCount = this.subscriptionCounts.get(normalized) ?? 0;

        if (currentCount <= 1) {
            this.subscriptionCounts.delete(normalized);

            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ action: 'unsubscribe', symbol: normalized }));
            }

            return;
        }

        this.subscriptionCounts.set(normalized, currentCount - 1);
    }

    addPriceListener(listener: PriceListener) {
        this.priceListeners.add(listener);
        this.connect();

        return () => {
            this.priceListeners.delete(listener);
        };
    }

    addConnectionListener(listener: ConnectionListener) {
        this.connectionListeners.add(listener);
        listener(this.isConnected);
        this.connect();

        return () => {
            this.connectionListeners.delete(listener);
        };
    }

    getConnectionState() {
        return this.isConnected;
    }

    private emitConnection() {
        this.connectionListeners.forEach((listener) => {
            listener(this.isConnected);
        });
    }
}

const sharedWebSocketManager = new WebSocketManager();

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
    const [isConnected, setIsConnected] = useState(sharedWebSocketManager.getConnectionState());
    const { onPriceUpdate, onConnected, onDisconnected } = options;
    const callbacksRef = useRef<UseWebSocketOptions>(options);

    useEffect(() => {
        callbacksRef.current = { onPriceUpdate, onConnected, onDisconnected };
    }, [onPriceUpdate, onConnected, onDisconnected]);

    useEffect(() => {
        const removePriceListener = sharedWebSocketManager.addPriceListener((symbol, data) => {
            callbacksRef.current.onPriceUpdate?.(symbol, data);
        });

        const removeConnectionListener = sharedWebSocketManager.addConnectionListener((nextConnected) => {
            setIsConnected((current) => (current === nextConnected ? current : nextConnected));

            if (nextConnected) {
                callbacksRef.current.onConnected?.();
            } else {
                callbacksRef.current.onDisconnected?.();
            }
        });

        return () => {
            removePriceListener();
            removeConnectionListener();
        };
    }, []);

    return useMemo(
        () => ({
            isConnected,
            subscribe: (symbol: string) => sharedWebSocketManager.subscribe(symbol),
            unsubscribe: (symbol: string) => sharedWebSocketManager.unsubscribe(symbol),
        }),
        [isConnected]
    );
};
