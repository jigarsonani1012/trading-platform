import { useCallback, useEffect, useRef, useState } from 'react';
import { getWebSocketUrl } from '../config';
import type { StockQuote } from '../types/stock';

interface UseWebSocketOptions {
    onPriceUpdate?: (symbol: string, data: StockQuote) => void;
    onConnected?: () => void;
    onDisconnected?: () => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);
    const subscriptionsRef = useRef<Set<string>>(new Set());
    const optionsRef = useRef(options);

    useEffect(() => {
        optionsRef.current = options;
    }, [options]);

    useEffect(() => {
        let isUnmounted = false;

        const connect = () => {
            const ws = new WebSocket(getWebSocketUrl());
            wsRef.current = ws;

            ws.onopen = () => {
                if (isUnmounted) {
                    return;
                }

                setIsConnected(true);
                optionsRef.current.onConnected?.();

                subscriptionsRef.current.forEach((symbol) => {
                    ws.send(JSON.stringify({ action: 'subscribe', symbol }));
                });
            };

            ws.onmessage = (event) => {
                const message = JSON.parse(event.data);

                if (message.type === 'price' && message.data) {
                    optionsRef.current.onPriceUpdate?.(message.symbol, message.data);
                }
            };

            ws.onclose = () => {
                if (isUnmounted) {
                    return;
                }

                setIsConnected(false);
                optionsRef.current.onDisconnected?.();
                reconnectTimeoutRef.current = window.setTimeout(connect, 3000);
            };
        };

        connect();

        return () => {
            isUnmounted = true;

            if (reconnectTimeoutRef.current !== null) {
                window.clearTimeout(reconnectTimeoutRef.current);
            }

            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, []);

    const subscribe = useCallback((symbol: string) => {
        const normalized = symbol.trim().toUpperCase();

        if (!normalized) {
            return;
        }

        subscriptionsRef.current.add(normalized);

        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ action: 'subscribe', symbol: normalized }));
        }
    }, []);

    const unsubscribe = useCallback((symbol: string) => {
        const normalized = symbol.trim().toUpperCase();
        subscriptionsRef.current.delete(normalized);

        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ action: 'unsubscribe', symbol: normalized }));
        }
    }, []);

    return { isConnected, subscribe, unsubscribe };
};