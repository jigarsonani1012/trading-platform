import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Loader2, TrendingDown, TrendingUp, Wifi, WifiOff } from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';
import type { StockQuote } from '../../types/stock';

const INDICES = [
    { id: 'nifty50', label: 'NIFTY 50', symbol: '^NSEI' },
    { id: 'banknifty', label: 'BANK NIFTY', symbol: '^NSEBANK' },
    { id: 'sensex', label: 'SENSEX', symbol: '^BSESN' },
];

const formatIndexValue = (value: number) =>
    new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value);

const MarketStats: React.FC = () => {
    const [indexData, setIndexData] = useState<Record<string, StockQuote>>({});

    const { isConnected, subscribe, unsubscribe } = useWebSocket({
        onPriceUpdate: (symbol, data) => {
            setIndexData((current) => ({
                ...current,
                [symbol]: data,
            }));
        },
    });

    useEffect(() => {
        INDICES.forEach((item) => subscribe(item.symbol));

        return () => {
            INDICES.forEach((item) => unsubscribe(item.symbol));
        };
    }, [subscribe, unsubscribe]);

    const cards = useMemo(
        () =>
            INDICES.map((item) => {
                const quote = indexData[item.symbol];
                return {
                    ...item,
                    quote,
                    isPositive: (quote?.percent_change ?? 0) >= 0,
                };
            }),
        [indexData]
    );

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                <div>
                    <h2 className="text-2xl font-bold text-gray-100">Market Snapshot</h2>
                    <p className="text-sm text-gray-400">Live websocket updates for NIFTY, BANK NIFTY, and SENSEX</p>
                </div>

                <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-full ${isConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                    <span>{isConnected ? 'Auto update live' : 'Snapshot reconnecting'}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {cards.map((item) => (
                    <div key={item.id} className="glass-effect rounded-2xl p-5 min-h-39">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="text-sm text-gray-400">{item.label}</p>
                                <h3 className="text-2xl font-bold text-gray-100 mt-1">
                                    {item.quote ? formatIndexValue(item.quote.last_price) : '--'}
                                </h3>
                            </div>

                            <div className={`p-3 rounded-xl ${item.isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                {item.quote ? (
                                    item.isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />
                                ) : (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                )}
                            </div>
                        </div>

                        {item.quote ? (
                            <>
                                <div className={`flex items-center gap-2 text-sm ${item.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {item.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                    <span>{item.isPositive ? '+' : ''}{item.quote.percent_change.toFixed(2)}%</span>
                                    <span className="text-gray-400">
                                        ({item.isPositive ? '+' : ''}{item.quote.change.toFixed(2)})
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-4 flex items-center gap-2">
                                    <Activity className="w-3 h-3" />
                                    <span>Updated {new Date(item.quote.timestamp).toLocaleTimeString()}</span>
                                </p>
                            </>
                        ) : (
                            <p className="text-sm text-gray-500">Waiting for live market feed...</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MarketStats;
