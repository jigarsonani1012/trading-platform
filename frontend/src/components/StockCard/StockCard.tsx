import React from 'react';
import { Activity, BarChart3, TrendingDown, TrendingUp, X } from 'lucide-react';
import type { StockQuote } from '../../types/stock';

interface StockCardProps {
    stock: StockQuote;
    onRemove: (symbol: string) => void;
    viewMode: 'grid' | 'list';
}

const StockCard: React.FC<StockCardProps> = ({ stock, onRemove, viewMode }) => {
    const isPositive = stock.percent_change >= 0;
    const TrendIcon = isPositive ? TrendingUp : TrendingDown;

    const formatCurrency = (num: number | null | undefined): string => {
        if (num === null || num === undefined || Number.isNaN(num)) {
            return 'N/A';
        }

        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: stock.currency || 'INR',
            maximumFractionDigits: 2,
        }).format(num);
    };

    const formatVolume = (volume: number | null | undefined): string => {
        if (volume === null || volume === undefined || Number.isNaN(volume)) {
            return 'N/A';
        }

        return new Intl.NumberFormat('en-IN', {
            notation: 'compact',
            maximumFractionDigits: 2,
        }).format(volume);
    };

    const exchangeLabel = stock.exchange === 'BSE' || stock.ticker?.includes('.BO') ? 'BSE' : 'NSE';

    if (viewMode === 'list') {
        return (
            <div className="stock-card px-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2.1fr)_1fr_0.9fr_1.1fr_44px] items-center gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-lg font-bold text-gray-100">{stock.symbol}</h3>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">{exchangeLabel}</span>
                        </div>
                        <p className="text-sm text-gray-400 truncate">{stock.company_name}</p>
                    </div>

                    <div className="md:text-right">
                        <div className="text-xs uppercase tracking-wide text-gray-500">LTP</div>
                        <div className="text-base font-semibold text-gray-100">{formatCurrency(stock.last_price)}</div>
                    </div>

                    <div className="md:text-right">
                        <div className="text-xs uppercase tracking-wide text-gray-500">Chg</div>
                        <div className={`text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                            {isPositive ? '+' : ''}{formatCurrency(stock.change)}
                        </div>
                    </div>

                    <div className="md:text-right">
                        <div className="text-xs uppercase tracking-wide text-gray-500">%Chg</div>
                        <div className={`inline-flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                            <TrendIcon className="w-4 h-4" />
                            <span>{isPositive ? '+' : ''}{stock.percent_change.toFixed(2)}%</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{new Date(stock.timestamp).toLocaleTimeString()}</div>
                    </div>

                    <button
                        onClick={() => onRemove(stock.symbol)}
                        className="justify-self-start md:justify-self-end p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                        title="Remove from this list"   
                    >
                        <X className="w-4 h-4 text-gray-400 hover:text-red-400" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="stock-card p-5 group">
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-xl font-bold text-gray-100">{stock.symbol}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">{exchangeLabel}</span>
                    </div>
                    <p className="text-sm text-gray-400 truncate">{stock.company_name}</p>
                </div>
                <button
                    onClick={() => onRemove(stock.symbol)}
                    className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                    title="Remove from this list"
                >
                    <X className="w-4 h-4 text-gray-400 hover:text-red-400" />
                </button>
            </div>

            <div className="mb-4">
                <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="text-3xl font-bold text-gray-100">{formatCurrency(stock.last_price)}</span>
                    <div className={`flex items-center gap-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                        <TrendIcon className="w-4 h-4" />
                        <span className="font-medium">{isPositive ? '+' : ''}{stock.percent_change.toFixed(2)}%</span>
                    </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                    Change: {isPositive ? '+' : ''}{formatCurrency(stock.change)}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-900/50 rounded-lg p-2">
                    <div className="text-xs text-gray-500 mb-1">Day Range</div>
                    <div className="text-sm font-medium text-gray-300">{formatCurrency(stock.day_low)} - {formatCurrency(stock.day_high)}</div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-2">
                    <div className="text-xs text-gray-500 mb-1">52W Range</div>
                    <div className="text-sm font-medium text-gray-300">{formatCurrency(stock.year_low)} - {formatCurrency(stock.year_high)}</div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-2">
                    <div className="text-xs text-gray-500 mb-1">Volume</div>
                    <div className="text-sm font-medium text-gray-300">{formatVolume(stock.volume)}</div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-2">
                    <div className="text-xs text-gray-500 mb-1">P/E Ratio</div>
                    <div className="text-sm font-medium text-gray-300">{stock.pe_ratio ? `${stock.pe_ratio.toFixed(2)}x` : 'N/A'}</div>
                </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-700/50 gap-3">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Activity className="w-3 h-3" />
                    <span>{stock.exchange ?? exchangeLabel}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <BarChart3 className="w-3 h-3" />
                    <span>{new Date(stock.timestamp).toLocaleTimeString()}</span>
                </div>
            </div>
        </div>
    );
};

export default StockCard;
