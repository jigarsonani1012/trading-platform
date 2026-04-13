import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useActiveListStocks } from '../../hooks/useStockData';
import { useWebSocket } from '../../hooks/useWebSocket';
import StockCard from '../StockCard/StockCard';
import MarketStats from '../MarketStats/MarketStats';
import ValidatedTextInput from '../ValidatedTextInput/ValidatedTextInput';
import {
    Plus,
    List,
    Grid,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    DollarSign,
    BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';
import StockChartWrapper from '../StockChart/StockChartWrapper';

export const TradingViewLayout: React.FC = () => {
    const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isChartExpanded, setIsChartExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [newSymbol, setNewSymbol] = useState('');

    const { data: stocks, isLoading: loading, refetch } = useActiveListStocks();
    const { isConnected } = useWebSocket();

    // -----------------------------
    // AUTO SELECT FIRST STOCK
    // -----------------------------
    useEffect(() => {
        if (stocks?.length && !selectedSymbol) {
            setSelectedSymbol(stocks[0].symbol);
        }
    }, [stocks, selectedSymbol]);

    // -----------------------------
    // FILTERED STOCKS (MEMO)
    // -----------------------------
    const filteredStocks = useMemo(() => {
        if (!stocks) return [];

        return stocks.filter((stock) => {
            const q = searchQuery.toLowerCase();
            return (
                stock.symbol.toLowerCase().includes(q) ||
                stock.company_name.toLowerCase().includes(q)
            );
        });
    }, [stocks, searchQuery]);

    // -----------------------------
    // SELECTED STOCK
    // -----------------------------
    const selectedStock = useMemo(
        () => stocks?.find((s) => s.symbol === selectedSymbol),
        [stocks, selectedSymbol]
    );

    // -----------------------------
    // HANDLERS (STABLE)
    // -----------------------------
    const handleAddSymbol = useCallback(async () => {
        if (!newSymbol.trim()) {
            toast.error('Enter a symbol');
            return;
        }

        const symbol = newSymbol.trim().toUpperCase();

        try {
            const res = await fetch(`/api/stocks/${symbol}`);
            if (!res.ok) throw new Error();

            setNewSymbol('');
            toast.success(`${symbol} added`);
        } catch {
            toast.error(`Invalid symbol: ${symbol}`);
        }
    }, [newSymbol]);

    const handleRemoveSymbol = useCallback(
        (symbol: string) => {
            if (selectedSymbol === symbol) {
                setSelectedSymbol(null);
            }
            toast.success(`${symbol} removed`);
        },
        [selectedSymbol]
    );

    const handleRefresh = useCallback(() => {
        refetch();
        toast.success('Refreshing...');
    }, [refetch]);

    // -----------------------------
    // STOCK LIST RENDER (MEMO)
    // -----------------------------
    const stockList = useMemo(() => {
        return filteredStocks.map((stock) => (
            <StockCard
                key={stock.symbol}
                stock={stock}
                onRemove={() => handleRemoveSymbol(stock.symbol)}
                viewMode={viewMode}
            />
        ));
    }, [filteredStocks, viewMode, handleRemoveSymbol]);

    // -----------------------------
    // UI
    // -----------------------------
    return (
        <div className="h-screen bg-gray-900 text-white flex">
            {/* ================= LEFT PANEL ================= */}
            <div className="w-80 border-r border-gray-700 flex flex-col">

                {/* HEADER */}
                <div className="p-4 border-b border-gray-700">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="flex items-center gap-2 font-bold">
                            <List className="w-5 h-5 text-blue-400" />
                            Watchlist
                        </h2>

                        <div className="flex gap-2">
                            <button
                                onClick={() =>
                                    setViewMode(viewMode === 'grid' ? 'list' : 'grid')
                                }
                                className="p-2 hover:bg-gray-700 rounded"
                            >
                                {viewMode === 'grid' ? <List size={16} /> : <Grid size={16} />}
                            </button>

                            <button
                                onClick={handleRefresh}
                                className="p-2 hover:bg-gray-700 rounded"
                            >
                                <RefreshCw size={16} />
                            </button>
                        </div>
                    </div>

                    {/* ADD SYMBOL */}
                    <div className="flex gap-2 mb-3">
                        <ValidatedTextInput
                            value={newSymbol}
                            onChange={setNewSymbol}
                            placeholder="AAPL"
                            className="flex-1 bg-gray-800 border-gray-600"
                            validate={(v) =>
                                v
                                    ? { isValid: true, error: null }
                                    : { isValid: false, error: 'Required' }
                            }
                        />
                        <button
                            onClick={handleAddSymbol}
                            className="px-3 bg-blue-600 hover:bg-blue-700 rounded flex items-center"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    {/* SEARCH */}
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search..."
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded"
                    />
                </div>

                {/* STATS */}
                <div className="p-4 border-b border-gray-700">
                    <MarketStats />
                </div>

                {/* LIST */}
                <div className="flex-1 overflow-y-auto will-change-transform">
                    {loading ? (
                        <div className="p-4 text-center text-gray-400">
                            Loading...
                        </div>
                    ) : filteredStocks.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                            No stocks found
                        </div>
                    ) : (
                        <div className="grid gap-2 p-2">{stockList}</div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="p-3 border-t border-gray-700 text-xs flex items-center gap-2">
                    <div
                        className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'
                            }`}
                    />
                    {isConnected ? 'Connected' : 'Disconnected'}
                </div>
            </div>

            {/* ================= RIGHT PANEL ================= */}
            <div className="flex-1 flex flex-col">

                {/* HEADER */}
                <div className="p-4 border-b border-gray-700 flex justify-between">
                    {selectedStock ? (
                        <div>
                            <h1 className="text-2xl font-bold">
                                {selectedStock.symbol}
                            </h1>
                            <p className="text-gray-400 text-sm">
                                {selectedStock.company_name}
                            </p>

                            <div className="flex gap-4 mt-2 text-sm">
                                <span className="flex items-center gap-1">
                                    <DollarSign size={14} />
                                    {selectedStock.last_price.toLocaleString('en-IN', {
                                        style: 'currency',
                                        currency: 'INR'
                                    })}
                                </span>

                                <span
                                    className={`flex items-center gap-1 ${selectedStock.change >= 0
                                            ? 'text-green-400'
                                            : 'text-red-400'
                                        }`}
                                >
                                    {selectedStock.change >= 0 ? (
                                        <TrendingUp size={14} />
                                    ) : (
                                        <TrendingDown size={14} />
                                    )}
                                    {selectedStock.change.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div>Select a stock</div>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsChartExpanded((v) => !v)}
                            className="px-3 py-2 bg-gray-700 rounded"
                        >
                            <BarChart3 size={16} />
                        </button>

                        <button
                            onClick={() => setSelectedSymbol(null)}
                            className="px-3 py-2 bg-gray-700 rounded"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                {/* CHART */}
                <div className="flex-1 relative">
                    {selectedStock ? (
                        <StockChartWrapper
                            symbol={selectedStock.symbol}
                            companyName={selectedStock.company_name}
                            isExpanded={isChartExpanded}
                            onClose={() => setSelectedSymbol(null)}
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                            Select a stock to view chart
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};