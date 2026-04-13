import React, { useState, useEffect } from 'react';
import { useActiveListStocks } from '../../hooks/useStockData';
import { useWebSocket } from '../../hooks/useWebSocket';
import StockCard from '../StockCard/StockCard';
import StockChart from '../StockChart/StockChart';
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

export const TradingViewLayout: React.FC = () => {
    const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isChartExpanded, setIsChartExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [newSymbol, setNewSymbol] = useState('');
    
    const { data: stocks, isLoading: loading, refetch: refreshStocks } = useActiveListStocks();
    const { isConnected } = useWebSocket();

    // Auto-select first stock when list changes
    useEffect(() => {
        if (stocks && stocks.length > 0 && !selectedSymbol) {
            setSelectedSymbol(stocks[0].symbol);
        }
    }, [stocks]);

    const handleAddSymbol = async () => {
        if (!newSymbol.trim()) {
            toast.error('Please enter a symbol');
            return;
        }

        const symbol = newSymbol.trim().toUpperCase();
        
        try {
            // Check if symbol exists
            const response = await fetch(`/api/stocks/${symbol}`);
            if (!response.ok) {
                throw new Error('Symbol not found');
            }

            setNewSymbol('');
            toast.success(`Added ${symbol} to watchlist`);
        } catch {
            toast.error(`Failed to add ${symbol}. Please check the symbol.`);
        }
    };

    const handleRemoveSymbol = (symbol: string) => {
        if (selectedSymbol === symbol) {
            setSelectedSymbol(null);
        }
        toast.success(`Removed ${symbol} from watchlist`);
    };

    const handleRefresh = () => {
        refreshStocks();
        toast.success('Refreshing data...');
    };

    const filteredStocks = stocks?.filter(stock =>
        stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.company_name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const selectedStock = stocks?.find(s => s.symbol === selectedSymbol);

    return (
        <div className="trading-view-layout h-screen bg-gray-900 text-white flex">
            {/* Left Panel - Watchlist */}
            <div className="watchlist-panel w-80 border-r border-gray-700 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <List className="w-5 h-5 text-blue-400" />
                            Watchlist
                        </h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                                className="p-2 hover:bg-gray-700 rounded transition-colors"
                                title={viewMode === 'grid' ? 'List View' : 'Grid View'}
                            >
                                {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={handleRefresh}
                                className="p-2 hover:bg-gray-700 rounded transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Add Symbol */}
                    <div className="flex gap-2 mb-3">
                        <ValidatedTextInput
                            value={newSymbol}
                            onChange={setNewSymbol}
                            placeholder="Add symbol (e.g., AAPL)"
                            className="flex-1 bg-gray-800 border-gray-600 text-white"
                            validate={(value) => {
                                if (!value) return { isValid: false, error: 'Symbol required' };
                                if (value.length < 1 || value.length > 10) return { isValid: false, error: 'Symbol must be 1-10 characters' };
                                return { isValid: true, error: null };
                            }}
                        />
                        <button
                            onClick={handleAddSymbol}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add
                        </button>
                    </div>

                    {/* Search */}
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search symbols..."
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    />
                </div>

                {/* Stats */}
                <div className="p-4 border-b border-gray-700 bg-gray-850">
                    <MarketStats />
                </div>

                {/* Stock List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-4 text-center text-gray-400">
                            Loading stocks...
                        </div>
                    ) : (
                        <div className="grid gap-2 p-2">
                            {filteredStocks.map((stock) => (
                                <StockCard
                                    key={stock.symbol}
                                    stock={stock}
                                    onRemove={() => handleRemoveSymbol(stock.symbol)}
                                    viewMode={viewMode}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Status */}
                <div className="p-3 border-t border-gray-700 bg-gray-850 text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                    </div>
                </div>
            </div>

            {/* Right Panel - Chart */}
            <div className="chart-panel flex-1 flex flex-col">
                {/* Chart Header */}
                <div className="p-4 border-b border-gray-700 bg-gray-850">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {selectedStock ? (
                                <>
                                    <div>
                                        <h1 className="text-2xl font-bold">{selectedStock.symbol}</h1>
                                        <p className="text-gray-400 text-sm">{selectedStock.company_name}</p>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="w-4 h-4 text-green-400" />
                                            <span className="font-mono">{selectedStock.last_price.toLocaleString('en-IN', {
                                                style: 'currency',
                                                currency: 'INR'
                                            })}</span>
                                        </div>
                                        <div className={`flex items-center gap-1 ${
                                            selectedStock.change >= 0 ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                            {selectedStock.change >= 0 ? (
                                                <TrendingUp className="w-4 h-4" />
                                            ) : (
                                                <TrendingDown className="w-4 h-4" />
                                            )}
                                            <span className="font-mono">
                                                {selectedStock.change >= 0 ? '+' : ''}{selectedStock.change.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <h1 className="text-2xl font-bold">Select a stock</h1>
                                    <p className="text-gray-400 text-sm">Choose a stock from the watchlist to view its chart</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsChartExpanded(!isChartExpanded)}
                                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors flex items-center gap-2"
                            >
                                <BarChart3 className="w-4 h-4" />
                                <span>{isChartExpanded ? 'Compress' : 'Expand'}</span>
                            </button>
                            <button
                                onClick={() => setSelectedSymbol(null)}
                                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </div>

                {/* Chart Area */}
                <div className="flex-1 relative">
                    {selectedStock ? (
                        <StockChart
                            symbol={selectedStock.symbol}
                            companyName={selectedStock.company_name}
                            isExpanded={isChartExpanded}
                            onClose={() => setSelectedSymbol(null)}
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center text-gray-500 p-8">
                                <div className="skeleton-chart h-64 w-96 mx-auto mb-6 bg-gradient-to-r from-gray-700/50 via-gray-600/50 to-gray-700/50 rounded-xl animate-pulse"></div>
                                <BarChart3 className="w-20 h-20 mx-auto mb-6 opacity-30" />
                                <h3 className="text-2xl font-bold mb-3">Advanced Chart View</h3>
                                <p className="text-lg mb-2">Select any stock from your watchlist</p>
                                <p className="text-gray-400">Live candlestick charts with time period controls and detailed stats</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};